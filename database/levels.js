const { db } = require("./database");

function createLevelUser({ userId, guildId }) {
    db.prepare(`
        INSERT OR IGNORE INTO levels (user_id, guild_id, xp, level, messages, last_xp)
        VALUES (?, ?, 0, 1, 0, 0)
    `).run(userId, guildId);
}

function getLevelUser(userId, guildId) {
    return db.prepare(`
        SELECT * FROM levels
        WHERE user_id = ? AND guild_id = ?
    `).get(userId, guildId);
}

const addXP = db.transaction(({
    userId,
    guildId,
    amount,
    timestamp = Date.now(),
    cooldownMs = 0
}) => {
    const value = Math.max(0, Number(amount) || 0);
    createLevelUser({ userId, guildId });

    const user = getLevelUser(userId, guildId);
    const earnedAt = Number(timestamp) || Date.now();
    const cooldown = Math.max(0, Number(cooldownMs) || 0);

    if (cooldown && earnedAt - user.last_xp < cooldown) {
        return {
            oldLevel: user.level,
            newLevel: user.level,
            leveledUp: false,
            awarded: false,
            xp: user.xp
        };
    }

    let xp = user.xp + value;
    let level = user.level;

    while (xp >= level * 100) {
        xp -= level * 100;
        level += 1;
    }

    db.prepare(`
        UPDATE levels
        SET xp = ?, level = ?, messages = messages + 1, last_xp = ?
        WHERE user_id = ? AND guild_id = ?
    `).run(xp, level, earnedAt, userId, guildId);

    return {
        oldLevel: user.level,
        newLevel: level,
        leveledUp: level > user.level,
        awarded: true,
        xp
    };
});

function getLeaderboard(guildId, limit = 10) {
    const safeLimit = Math.min(25, Math.max(1, Number(limit) || 10));
    return db.prepare(`
        SELECT * FROM levels
        WHERE guild_id = ?
        ORDER BY level DESC, xp DESC, messages DESC
        LIMIT ?
    `).all(guildId, safeLimit);
}

function resetXP(userId, guildId) {
    createLevelUser({ userId, guildId });
    return db.prepare(`
        UPDATE levels SET xp = 0, level = 1, messages = 0
        WHERE user_id = ? AND guild_id = ?
    `).run(userId, guildId);
}

function setXP(userId, guildId, amount) {
    createLevelUser({ userId, guildId });
    const user = getLevelUser(userId, guildId);
    const maximum = Math.max(0, user.level * 100 - 1);
    const safeAmount = Math.min(maximum, Math.max(0, Number(amount) || 0));

    db.prepare(`
        UPDATE levels SET xp = ?
        WHERE user_id = ? AND guild_id = ?
    `).run(safeAmount, userId, guildId);

    return getLevelUser(userId, guildId);
}

function setLevel(userId, guildId, level) {
    createLevelUser({ userId, guildId });
    return db.prepare(`
        UPDATE levels SET level = ?
        WHERE user_id = ? AND guild_id = ?
    `).run(Math.max(1, Number(level) || 1), userId, guildId);
}

module.exports = {
    createLevelUser,
    addXP,
    getLevelUser,
    getLeaderboard,
    resetXP,
    setXP,
    setLevel
};
