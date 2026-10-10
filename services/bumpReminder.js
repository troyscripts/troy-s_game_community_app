const settings = require('../database/guildSettings');
const taskState = require('../database/taskState');
const logger = require('../utils/logger');
const TASK = 'bump:reminder';
const INTERVAL = 2 * 60 * 60 * 1000;
let timer;
let running = false;
const lastWarning = new Map();
function readState(guildId) {
    try {
        const value = JSON.parse(taskState.getLastRun(TASK, guildId));
        return value && typeof value.channelId === 'string' && Number.isFinite(value.nextAt) ? value : null;
    } catch { return null; }
}
function schedule(guildId, channelId) {
    taskState.setLastRun(TASK, guildId, JSON.stringify({ channelId, nextAt: Date.now() + INTERVAL }));
}
async function tick(client) {
    if (running) return;
    running = true;
    try {
        for (const guild of client.guilds.cache.values()) {
            try {
                const channelId = settings.getGuildConfig(guild.id).Bump?.Channel || '';
                let state = readState(guild.id);
                if (!channelId) {
                    if (state) taskState.setLastRun(TASK, guild.id, 'null');
                    continue;
                }
                if (!state || state.channelId !== channelId) {
                    state = { channelId, nextAt: Date.now() };
                    taskState.setLastRun(TASK, guild.id, JSON.stringify(state));
                }
                if (state.nextAt > Date.now()) continue;
                const channel = await client.channels.fetch(channelId);
                if (!channel || channel.guildId !== guild.id || !channel.isTextBased?.() || typeof channel.send !== 'function') {
                    throw new Error('Bump.Channel is geen bereikbaar tekstkanaal in deze server.');
                }
                // Een kanaalwijziging tijdens het ophalen mag geen bericht naar het oude kanaal sturen.
                if ((settings.getGuildConfig(guild.id).Bump?.Channel || '') !== channelId) continue;
                await channel.send({
                    content: '🔔 **Bump-herinnering**\nHet is weer tijd om de server te bumpen! Gebruik `/bump` in dit kanaal. Bedankt voor je hulp! 💙',
                    allowedMentions: { parse: [] }
                });
                // Alleen een bevestigde verzending schuift de volgende herinnering op.
                schedule(guild.id, channelId);
                lastWarning.delete(guild.id);
            } catch (error) {
                if (!lastWarning.has(guild.id) || Date.now() - lastWarning.get(guild.id) >= 300000) {
                    logger.warn(`Bump-herinnering [${guild.id}]: ${error.message}. Controleer kanaal en botrechten; er volgt automatisch een nieuwe poging.`);
                    lastWarning.set(guild.id, Date.now());
                }
            }
        }
    } finally { running = false; }
}
function start(client) {
    if (timer) return;
    const run = () => tick(client).catch(error => logger.warn(`Bump-herinnering: ${error.message}`));
    timer = setInterval(run, 30000);
    timer.unref();
    void run();
}
module.exports = { start, tick };
