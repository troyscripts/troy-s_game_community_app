// Globale instellingen per installatie: alleen via .env, nooit via /config.
const CENTRAL_BOT_ID = '1486317240319082597';
function settings(env = process.env) {
    const enabled = env.BROADCAST_ENABLED === 'true';
    if (!enabled) return { enabled: false, centralBotId: CENTRAL_BOT_ID };
    const secret = env.BROADCAST_SECRET || '';
    if (!/^[a-fA-F0-9]{64}$/.test(secret)) throw new Error('BROADCAST_SECRET moet een willekeurige sleutel van 64 hextekens zijn.');
    const botIds = [...new Set((env.BROADCAST_BOT_IDS || '').split(',').map(x => x.trim()).filter(Boolean))];
    if (!botIds.includes(CENTRAL_BOT_ID) || botIds.some(id => !/^\d{17,20}$/.test(id))) {
        throw new Error('BROADCAST_BOT_IDS moet de centrale bot en alle aangesloten bot-ID’s bevatten.');
    }
    const port = Number(env.BROADCAST_PORT || 8080);
    const pollSeconds = Number(env.BROADCAST_POLL_SECONDS || 15);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Ongeldige BROADCAST_PORT.');
    if (!Number.isInteger(pollSeconds) || pollSeconds < 5 || pollSeconds > 300) throw new Error('BROADCAST_POLL_SECONDS moet 5 t/m 300 zijn.');
    return { enabled, centralBotId: CENTRAL_BOT_ID, secret, botIds, port,
        host: env.BROADCAST_BIND || '0.0.0.0', url: env.BROADCAST_URL || '', pollSeconds };
}
module.exports = { settings, CENTRAL_BOT_ID };
