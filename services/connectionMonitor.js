const { Events } = require("discord.js");
const logger = require("../utils/logger");

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
        normal: "Normaal",
        elevated: "Verhoogd",
        high: "Hoog",
        critical: "Kritiek",
        unknown: "Onbekend"
    }[status] || "Onbekend";
}

function recordSample(client, { announce = true } = {}) {
    const ping = Number(client?.ws?.ping);
    if (!Number.isFinite(ping) || ping < 0) return null;

    const now = Date.now();
    if (lastSampleTickAt) {
        eventLoopDelayMs = Math.max(0, now - lastSampleTickAt - SAMPLE_INTERVAL_MS);
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
    if (!Number.isFinite(ms) || ms < 0) return "n.v.t.";
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
    const ping = Number.isFinite(Number(client?.ws?.ping)) ? Math.round(Number(client.ws.ping)) : "onbekend";
    const uptime = formatDuration(process.uptime() * 1000);
    return `shard=${shardId}, gateway=${ping}ms, sinds-vorige=${sincePrevious}, event-loop-delay=${Math.round(eventLoopDelayMs)}ms, heap=${heapMb}MB, rss=${rssMb}MB, uptime=${uptime}`;
}

function startConnectionMonitor(client) {
    if (timer || !client) return;
    activeClient = client;
    startedAt = Date.now();
    lastSampleTickAt = startedAt;

    listeners = {
        error: (error) => {
            clientErrors += 1;
            if (isTimeout(error)) timeouts += 1;
        },
        shardDisconnect: (event, shardId) => {
            disconnects += 1;
            const code = Number.isFinite(Number(event?.code)) ? event.code : "onbekend";
            const reason = String(event?.reason || "geen reden").replace(/\s+/g, " ").slice(0, 180);
            logger.warn(`[Discord Connection Monitor] Gateway disconnect op shard ${shardId}. Code: ${code}; reden: ${reason}. Totaal: ${disconnects}.`);
        },
        shardReconnecting: (shardId) => {
            reconnects += 1;
            logger.warn(`[Discord Connection Monitor] Gateway reconnect op shard ${shardId}. Totaal: ${reconnects}. Diagnose: ${reconnectDiagnostics(client, shardId)}.`);
        },
        shardResume: (shardId, replayedEvents) => {
            resumes += 1;
            logger.info(`[Discord Connection Monitor] Gateway hervat op shard ${shardId}; ${replayedEvents} events opnieuw afgespeeld.`);
        }
    };

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

    if (activeClient && listeners) {
        activeClient.off(Events.Error, listeners.error);
        activeClient.off(Events.ShardDisconnect, listeners.shardDisconnect);
        activeClient.off(Events.ShardReconnecting, listeners.shardReconnecting);
        activeClient.off(Events.ShardResume, listeners.shardResume);
    }

    activeClient = null;
    listeners = null;
}

function getSnapshot(client = activeClient) {
    if (client) recordSample(client, { announce: false });
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
