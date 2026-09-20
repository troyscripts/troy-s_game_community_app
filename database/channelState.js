const { db } = require("./database");

function getChannelState(channelId) {
    return db.prepare(
        "SELECT * FROM channel_state WHERE channel_id = ?"
    ).get(channelId);
}

function setChannelState(channelId, guildId, lastMessageId) {
    db.prepare(`
        INSERT INTO channel_state
            (channel_id, guild_id, last_message_id, last_scanned_at)
        VALUES (?, ?, ?, strftime('%s','now'))
        ON CONFLICT(channel_id) DO UPDATE SET
            guild_id = excluded.guild_id,
            last_message_id = excluded.last_message_id,
            last_scanned_at = excluded.last_scanned_at
    `).run(channelId, guildId, lastMessageId || null);
}

module.exports = {
    getChannelState,
    setChannelState
};
