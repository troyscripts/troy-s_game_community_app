const { db } = require("./database");

function addItem({ guildId, title, description, scheduledAt, createdBy }) {
    const result = db.prepare(`
        INSERT INTO youtube_agenda (
            guild_id,
            title,
            description,
            scheduled_at,
            created_by
        )
        VALUES (?, ?, ?, ?, ?)
    `).run(
        guildId,
        title,
        description || null,
        scheduledAt,
        createdBy
    );

    return Number(result.lastInsertRowid);
}

function getItem(id, guildId) {
    return db.prepare(`
        SELECT * FROM youtube_agenda
        WHERE id = ? AND guild_id = ?
    `).get(id, guildId);
}

function getItems(guildId) {
    return db.prepare(`
        SELECT * FROM youtube_agenda
        WHERE guild_id = ?
        ORDER BY scheduled_at ASC, id ASC
    `).all(guildId);
}

function removeItem(id, guildId) {
    return db.prepare(`
        DELETE FROM youtube_agenda
        WHERE id = ? AND guild_id = ?
    `).run(id, guildId);
}

function getPublication(guildId, channelId) {
    return db.prepare(`
        SELECT * FROM youtube_agenda_messages
        WHERE guild_id = ? AND channel_id = ?
    `).get(guildId, channelId);
}

function getPublications(guildId) {
    return db.prepare(`
        SELECT * FROM youtube_agenda_messages
        WHERE guild_id = ?
        ORDER BY channel_id ASC
    `).all(guildId);
}

function savePublication({ guildId, channelId, messageId }) {
    db.prepare(`
        INSERT INTO youtube_agenda_messages (guild_id, channel_id, message_id)
        VALUES (?, ?, ?)
        ON CONFLICT(guild_id, channel_id)
        DO UPDATE SET
            message_id = excluded.message_id,
            updated_at = strftime('%s','now')
    `).run(guildId, channelId, messageId);
}

function removePublication(guildId, channelId) {
    return db.prepare(`
        DELETE FROM youtube_agenda_messages
        WHERE guild_id = ? AND channel_id = ?
    `).run(guildId, channelId);
}

module.exports = {
    addItem,
    getItem,
    getItems,
    removeItem,
    getPublication,
    getPublications,
    savePublication,
    removePublication
};
