const { db } = require("./database");

function setBirthday(userId, guildId, date) {
    db.prepare(`
        INSERT INTO birthdays (user_id, guild_id, birthday)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, guild_id)
        DO UPDATE SET birthday = excluded.birthday
    `).run(userId, guildId, date);
}

function getBirthday(userId, guildId) {
    return db.prepare(`
        SELECT * FROM birthdays
        WHERE user_id = ? AND guild_id = ?
    `).get(userId, guildId);
}

function removeBirthday(userId, guildId) {
    return db.prepare(`
        DELETE FROM birthdays
        WHERE user_id = ? AND guild_id = ?
    `).run(userId, guildId);
}

function getBirthdays(guildId) {
    return db.prepare(`
        SELECT * FROM birthdays
        WHERE guild_id = ?
        ORDER BY substr(birthday, 4, 2), substr(birthday, 1, 2)
    `).all(guildId);
}

function getBirthdaysForDay(guildId, dayMonth) {
    return db.prepare(`
        SELECT * FROM birthdays
        WHERE guild_id = ? AND substr(birthday, 1, 5) = ?
        ORDER BY user_id
    `).all(guildId, dayMonth);
}

module.exports = {
    setBirthday,
    getBirthday,
    removeBirthday,
    getBirthdays,
    getBirthdaysForDay
};
