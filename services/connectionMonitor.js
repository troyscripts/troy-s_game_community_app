const { Events } = require("discord.js");
const logger = require("../utils/logger");

const SAMPLE_INTERVAL_MS = 60_000;
const MAX_SAMPLES = 1440; // maximaal 24 uur bij 1 meting per minuut

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

function classify(ping) {
    if (!Number.isFinite(ping) || ping < 0) return "unknown";
    if (ping >= 500) return "critical";
    if (ping >= 250) return "high";
    if (ping >= 150) return "elevated";
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

    const sample = { ping: Math.round(ping), at: Date.now() };
    samples.push(sample);
    if (samples.length > MAX_SAMPLES) samples = samples.slice(-MAX_SAMPLES);

    const status = classify(sample.ping);
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

function startConnectionMonitor(client) {
    if (timer || !client) return;
    activeClient = client;
    startedAt = Date.now();

    listeners = {
        error: (error) => {
            clientErrors += 1;
            if (isTimeout(error)) timeouts += 1;
        },
        shardDisconnect: (_event, shardId) => {
            disconnects += 1;
            logger.warn(`[Discord Connection Monitor] Gateway disconnect op shard ${shardId}. Totaal: ${disconnects}.`);
        },
        shardReconnecting: (shardId) => {
            reconnects += 1;
            logger.warn(`[Discord Connection Monitor] Gateway reconnect op shard ${shardId}. Totaal: ${reconnects}.`);
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
    logger.info("Discord Connection Monitor gestart (meting elke 60 seconden).");
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

    return {
        current,
        average,
        min: valid.length ? Math.min(...valid) : null,
        max: valid.length ? Math.max(...valid) : null,
        status: classify(current),
        statusLabel: statusLabel(classify(current)),
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
    statusLabel
};
