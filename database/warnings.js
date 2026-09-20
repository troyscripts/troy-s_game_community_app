const { db } = require("./database");

function addWarning({ userId, guildId, moderatorId, reason }) {
    const result = db.prepare(`
        INSERT INTO warnings (user_id, guild_id, moderator_id, reason)
        VALUES (?, ?, ?, ?)
    `).run(userId, guildId, moderatorId, reason);

    return result.lastInsertRowid;
}

function getWarnings(userId, guildId) {
    return db.prepare(`
        SELECT * FROM warnings
        WHERE user_id = ? AND guild_id = ?
        ORDER BY created_at DESC
    `).all(userId, guildId);
}

function getWarning(id) {
    return db.prepare("SELECT * FROM warnings WHERE id = ?").get(id);
}

function removeWarning(id) {
    return db.prepare("DELETE FROM warnings WHERE id = ?").run(id).changes > 0;
}

function clearWarnings(userId, guildId) {
    return db.prepare(`
        DELETE FROM warnings WHERE user_id = ? AND guild_id = ?
    `).run(userId, guildId).changes;
}

function getWarningCount(userId, guildId) {
    return db.prepare(`
        SELECT COUNT(*) AS amount FROM warnings
        WHERE user_id = ? AND guild_id = ?
    `).get(userId, guildId).amount;
}

module.exports = {
    addWarning,
    getWarnings,
    getWarning,
    removeWarning,
    clearWarnings,
    getWarningCount
};
