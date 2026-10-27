const config = require('../config/config');
const logger = require('../utils/logger');
const { isBotOwner } = require('../utils/botIdentity');
let running = false;

async function broadcast(client, userId, message, requestId) {
    if (process.env.BROADCAST_ENABLED === 'true') {
        return require('./broadcastNetwork').publish(client, userId, message, requestId);
    }
    if (!isBotOwner(userId)) throw new Error('Alleen de vaste boteigenaar kan een botbericht versturen.');
    if (typeof message !== 'string' || !message.trim() || message.length > 2000) {
        throw new Error('Het bericht moet 1 tot 2000 tekens bevatten.');
    }
    if (running) throw new Error('Er wordt al een botbericht verstuurd. Wacht tot dit klaar is.');
    running = true;
    const result = { sent: 0, skipped: 0, failed: 0 };
    try {
        for (const guild of client.guilds.cache.values()) {
            try {
                await config.__context.run(guild.id, async () => {
                    const channelId = config.Logging?.Channel;
                    if (!channelId) { result.skipped++; return; }
                    const channel = await guild.channels.fetch(channelId);
                    if (!channel || channel.guild?.id !== guild.id || !channel.isTextBased?.() || typeof channel.send !== 'function') {
                        throw new Error('Botlogkanaal is niet bereikbaar of geen tekstkanaal van deze server.');
                    }
                    // Raw user text is preserved; no translation or mention notifications.
                    await channel.send({ content: message, allowedMentions: { parse: [] } });
                    result.sent++;
                    logger.info(`[Botbericht] ${guild.name} (${guild.id}): verstuurd naar ${channel.name} (${channel.id}).`);
                });
            } catch (error) {
                result.failed++;
                logger.warn(`[Botbericht] ${guild.name} (${guild.id}): ${error.message}`);
            }
        }
        return result;
    } finally { running = false; }
}
module.exports = { broadcast };
