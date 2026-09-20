const { db } = require("./database");

function getLastRun(task, guildId) {
    return db.prepare(`
        SELECT last_run FROM scheduler_state
        WHERE task = ? AND guild_id = ?
    `).get(task, guildId)?.last_run || null;
}

function setLastRun(task, guildId, value) {
    db.prepare(`
        INSERT INTO scheduler_state (task, guild_id, last_run)
        VALUES (?, ?, ?)
        ON CONFLICT(task, guild_id) DO UPDATE SET last_run = excluded.last_run
    `).run(task, guildId, value);
}

module.exports = {
    getLastRun,
    setLastRun
};
