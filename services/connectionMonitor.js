const { tr } = require("../utils/localization");
const { Events } = require("discord.js");
const logger = require("../utils/logger");
const { monitorEventLoopDelay } = require('node:perf_hooks');
const { networkReason } = require('../utils/platformRequest');
const gatewayHints = new Map();
const reconnectStarted = new Map();
let loopHistogram = null;
function captureGatewayHint(message) {
    const text = String(message);
    const shard = text.match(/\[WS => Shard (\d+)\]/)?.[1];
    if (shard === undefined || !text.includes('Destroying shard')) return;
    // Whitelist labels only: raw debug text can contain session data.
    const reason = text.includes('Reason: Told to reconnect by Discord') ? 'Discord vraagt reconnect'
        : text.includes('Reason: Zombie connection') ? 'Heartbeat-antwoord ontbreekt'
        : 'Gatewayverbinding wordt heropend; oorzaak onbekend';
    gatewayHints.set(Number(shard), {reason, at: Date.now()});
}

const SAMPLE_INTERVAL_MS = 60_000;
const MAX_SAMPLES = 1440; // maximaal 24 uur bij 1 meting per minuut

// Hysterese voorkomt dat de status rond één grens continu heen en weer springt.
const THRESHOLDS = {
    elevatedEnter: 175,
    elevatedExit: 150,
    highEnter: 300,
    highExit: 250,
    criticalEnter: 550,
    criticalExit: 500
};

let timer = null;
let activeClient = null;
let samples = [];
let startedAt = null;
let lastStatus = null;
let disconnects = 0;
let reconnects = 0;
let resumes = 0;
let timeouts = 0;
let clientErrors = 0;
let listeners = null;
let lastReconnectAt = null;
let lastSampleTickAt = null;
let eventLoopDelayMs = 0;

function classify(ping) {
    if (!Number.isFinite(ping) || ping < 0) return "unknown";
    if (ping >= 500) return "critical";
    if (ping >= 250) return "high";
    if (ping >= 150) return "elevated";
    return "normal";
}

function classifyWithHysteresis(ping, previous = lastStatus) {
    if (!Number.isFinite(ping) || ping < 0) return "unknown";
    if (!previous || previous === "unknown") return classify(ping);

    if (previous === "critical") {
        if (ping >= THRESHOLDS.criticalExit) return "critical";
        if (ping >= THRESHOLDS.highExit) return "high";
        if (ping >= THRESHOLDS.elevatedExit) return "elevated";
        return "normal";
    }
    if (previous === "high") {
        if (ping >= THRESHOLDS.criticalEnter) return "critical";
        if (ping >= THRESHOLDS.highExit) return "high";
        if (ping >= THRESHOLDS.elevatedExit) return "elevated";
        return "normal";
    }
    if (previous === "elevated") {
        if (ping >= THRESHOLDS.criticalEnter) return "critical";
        if (ping >= THRESHOLDS.highEnter) return "high";
        if (ping >= THRESHOLDS.elevatedExit) return "elevated";
        return "normal";
    }

    if (ping >= THRESHOLDS.criticalEnter) return "critical";
    if (ping >= THRESHOLDS.highEnter) return "high";
    if (ping >= THRESHOLDS.elevatedEnter) return "elevated";
    return "normal";
}

function statusLabel(status) {
    return {
        normal: tr("Normaal"),
        elevated: tr("Verhoogd"),
        high: tr("Hoog"),
        critical: tr("Kritiek"),
        unknown: tr("Onbekend")
    }[status] || tr("Onbekend");
}

function recordSample(client, { announce = true } = {}) {
    const ping = Number(client?.ws?.ping);
    if (!Number.isFinite(ping) || ping < 0) return null;

    const now = Date.now();
    if (lastSampleTickAt) {
        eventLoopDelayMs = loopHistogram ? loopHistogram.max / 1e6 : Math.max(0, now - lastSampleTickAt - SAMPLE_INTERVAL_MS);
        loopHistogram?.reset();
    }
    lastSampleTickAt = now;

    const sample = { ping: Math.round(ping), at: now };
    samples.push(sample);
    if (samples.length > MAX_SAMPLES) samples = samples.slice(-MAX_SAMPLES);

    const status = classifyWithHysteresis(sample.ping, lastStatus);
    if (announce && lastStatus && status !== lastStatus) {
        const message = `[Discord Connection Monitor] Status ${statusLabel(lastStatus)} -> ${statusLabel(status)} (${sample.ping} ms).`;
        if (status === "high" || status === "critical") logger.warn(message);
        else logger.info(message);
    }
    lastStatus = status;
    return sample;
}

function isTimeout(error) {
    const text = `${error?.name || ""} ${error?.code || ""} ${error?.message || ""}`.toLowerCase();
    return text.includes("timeout") || text.includes("etimedout");
}

function formatDuration(ms) {
    if (!Number.isFinite(ms) || ms < 0) return tr("n.v.t.");
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${minutes}m ${rest}s`;
}

function reconnectDiagnostics(client, shardId) {
    const now = Date.now();
    const sincePrevious = lastReconnectAt ? formatDuration(now - lastReconnectAt) : "eerste reconnect";
    lastReconnectAt = now;
    const memory = process.memoryUsage();
    const heapMb = Math.round(memory.heapUsed / 1024 / 1024);
    const rssMb = Math.round(memory.rss / 1024 / 1024);
    const ping = Number.isFinite(Number(client?.ws?.ping)) ? Math.round(Number(client.ws.ping)) : tr("onbekend");
    const uptime = formatDuration(process.uptime() * 1000);
    const hint = gatewayHints.get(shardId);
    const reason = hint && now - hint.at < 60000 ? hint.reason : 'onbekend; hosting of Discord niet vastgesteld';
    gatewayHints.delete(shardId);
    const loopMax = Math.round(Math.max(eventLoopDelayMs, (loopHistogram?.max || 0) / 1e6));
    return `oorzaak=${reason}, shard=${shardId}, gateway=${ping}ms, sinds-vorige=${sincePrevious}, event-loop-max=${loopMax}ms, heap=${heapMb}MB, rss=${rssMb}MB, uptime=${uptime}`;
}

function startConnectionMonitor(client) {
    if (timer || !client) return;
    activeClient = client;
    loopHistogram = monitorEventLoopDelay({resolution: 20});
    loopHistogram.enable();
    startedAt = Date.now();
    lastSampleTickAt = startedAt;

    listeners = {
        debug: captureGatewayHint,
        shardError: (error, shardId) => {
            clientErrors += 1;
            if (isTimeout(error)) timeouts += 1;
            logger.warn(`[Discord Connection Monitor] Netwerkfout op shard ${shardId}: ${networkReason(error)}.`);
        },
        error: (error) => {
            clientErrors += 1;
            if (isTimeout(error)) timeouts += 1;
        },
        shardDisconnect: (event, shardId) => {
            disconnects += 1;
            const code = Number.isFinite(Number(event?.code)) ? event.code : tr("onbekend");
            const reason = String(event?.reason || tr("geen reden")).replace(/\s+/g, " ").slice(0, 180);
            logger.warn(`[Discord Connection Monitor] Gateway disconnect op shard ${shardId}. Code: ${code}; reden: ${reason}. Totaal: ${disconnects}.`);
        },
        shardReconnecting: (shardId) => {
            reconnects += 1;
            reconnectStarted.set(shardId, Date.now());
            logger.warn(`[Discord Connection Monitor] Gateway reconnect op shard ${shardId}. Totaal: ${reconnects}. Diagnose: ${reconnectDiagnostics(client, shardId)}.`);
        },
        shardResume: (shardId, replayedEvents) => {
            resumes += 1;
            const began = reconnectStarted.get(shardId);
            const duration = began === undefined ? 'onbekend' : `${Date.now() - began}ms`;
            reconnectStarted.delete(shardId);
            logger.info(`[Discord Connection Monitor] Gateway hervat op shard ${shardId}; hersteltijd=${duration}; ${replayedEvents} events opnieuw afgespeeld.`);
        }
    };

    client.on(Events.Debug, listeners.debug);
    client.on(Events.ShardError, listeners.shardError);
    client.on(Events.Error, listeners.error);
    client.on(Events.ShardDisconnect, listeners.shardDisconnect);
    client.on(Events.ShardReconnecting, listeners.shardReconnecting);
    client.on(Events.ShardResume, listeners.shardResume);

    recordSample(client, { announce: false });
    timer = setInterval(() => recordSample(client), SAMPLE_INTERVAL_MS);
    timer.unref?.();
    logger.info("Discord Connection Monitor gestart (meting elke 60 seconden; hysterese en reconnectdiagnose actief).");
}

function stopConnectionMonitor() {
    if (timer) clearInterval(timer);
    timer = null;

    loopHistogram?.disable();
    loopHistogram = null;
    gatewayHints.clear();
    reconnectStarted.clear();
    if (activeClient && listeners) {
        activeClient.off(Events.Debug, listeners.debug);
        activeClient.off(Events.ShardError, listeners.shardError);
        activeClient.off(Events.Error, listeners.error);
        activeClient.off(Events.ShardDisconnect, listeners.shardDisconnect);
        activeClient.off(Events.ShardReconnecting, listeners.shardReconnecting);
        activeClient.off(Events.ShardResume, listeners.shardResume);
    }

    activeClient = null;
    listeners = null;
}

function getSnapshot(client = activeClient) {
    // Reading the status must not shift the periodic measurement window.
    const valid = samples.map(sample => sample.ping).filter(Number.isFinite);
    const current = Number.isFinite(Number(client?.ws?.ping)) ? Math.round(Number(client.ws.ping)) : null;
    const average = valid.length ? Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length) : null;
    const status = Number.isFinite(current) ? (lastStatus || classify(current)) : "unknown";

    return {
        current,
        average,
        min: valid.length ? Math.min(...valid) : null,
        max: valid.length ? Math.max(...valid) : null,
        status,
        statusLabel: statusLabel(status),
        samples: valid.length,
        disconnects,
        reconnects,
        resumes,
        timeouts,
        clientErrors,
        startedAt
    };
}

module.exports = {
    startConnectionMonitor,
    stopConnectionMonitor,
    getSnapshot,
    classify,
    classifyWithHysteresis,
    statusLabel
};
