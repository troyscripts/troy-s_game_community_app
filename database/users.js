const { db } = require("./database");

function createUser(user, guild) {
    db.prepare(`
        INSERT INTO users (user_id, guild_id, username, global_name)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, guild_id) DO UPDATE SET
            username = excluded.username,
            global_name = excluded.global_name,
            updated_at = strftime('%s','now')
    `).run(user.id, guild.id, user.username, user.globalName || null);

    return true;
}

function getUser(userId, guildId) {
    return db.prepare(`
        SELECT * FROM users
        WHERE user_id = ? AND guild_id = ?
    `).get(userId, guildId);
}

function exists(userId, guildId) {
    return Boolean(getUser(userId, guildId));
}

function updateUsername(userId, guildId, username, globalName = null) {
    return db.prepare(`
        UPDATE users
        SET username = ?, global_name = ?, updated_at = strftime('%s','now')
        WHERE user_id = ? AND guild_id = ?
    `).run(username, globalName, userId, guildId);
}

function getGuildUsers(guildId) {
    return db.prepare(`
        SELECT * FROM users
        WHERE guild_id = ?
        ORDER BY created_at ASC
    `).all(guildId);
}

module.exports = {
    createUser,
    getUser,
    exists,
    updateUsername,
    getGuildUsers
};
