const { db } = require("./database");
const config = require("../config/config");

function createUser(userId, guildId) {
    db.prepare(`
        INSERT OR IGNORE INTO economy
            (user_id, guild_id, wallet, bank, last_daily, last_work)
        VALUES (?, ?, ?, 0, 0, 0)
    `).run(userId, guildId, Number(config.Economy.StartingMoney) || 0);

    return getBalance(userId, guildId);
}

function getBalance(userId, guildId) {
    return db.prepare(`
        SELECT * FROM economy
        WHERE user_id = ? AND guild_id = ?
    `).get(userId, guildId);
}

function getOrCreate(userId, guildId) {
    return getBalance(userId, guildId) || createUser(userId, guildId);
}

function setMoney(userId, guildId, wallet, bank) {
    createUser(userId, guildId);
    db.prepare(`
        UPDATE economy SET wallet = ?, bank = ?
        WHERE user_id = ? AND guild_id = ?
    `).run(Math.max(0, wallet), Math.max(0, bank), userId, guildId);
}

function change(column, userId, guildId, amount) {
    if (!["wallet", "bank"].includes(column)) {
        throw new Error("Ongeldige economy-kolom.");
    }

    createUser(userId, guildId);
    db.prepare(`
        UPDATE economy
        SET ${column} = MAX(0, ${column} + ?)
        WHERE user_id = ? AND guild_id = ?
    `).run(Number(amount), userId, guildId);

    return getBalance(userId, guildId);
}

const transferWallet = db.transaction((senderId, receiverId, guildId, amount) => {
    const value = Number(amount);
    const sender = getOrCreate(senderId, guildId);

    if (!Number.isSafeInteger(value) || value <= 0 || sender.wallet < value) {
        return false;
    }

    createUser(receiverId, guildId);
    change("wallet", senderId, guildId, -value);
    change("wallet", receiverId, guildId, value);
    return true;
});

const deposit = db.transaction((userId, guildId, amount) => {
    const value = Number(amount);
    const user = getOrCreate(userId, guildId);

    if (!Number.isSafeInteger(value) || value <= 0 || user.wallet < value) {
        return false;
    }

    change("wallet", userId, guildId, -value);
    change("bank", userId, guildId, value);
    return getBalance(userId, guildId);
});

const withdraw = db.transaction((userId, guildId, amount) => {
    const value = Number(amount);
    const user = getOrCreate(userId, guildId);

    if (!Number.isSafeInteger(value) || value <= 0 || user.bank < value) {
        return false;
    }

    change("bank", userId, guildId, -value);
    change("wallet", userId, guildId, value);
    return getBalance(userId, guildId);
});

function setCooldown(column, userId, guildId, timestamp) {
    if (!["last_daily", "last_work"].includes(column)) {
        throw new Error("Ongeldige cooldown-kolom.");
    }

    createUser(userId, guildId);
    db.prepare(`
        UPDATE economy SET ${column} = ?
        WHERE user_id = ? AND guild_id = ?
    `).run(Number(timestamp), userId, guildId);
}

function getLeaderboard(guildId, limit = 10) {
    const safeLimit = Math.min(25, Math.max(1, Number(limit) || 10));
    return db.prepare(`
        SELECT *, wallet + bank AS total
        FROM economy
        WHERE guild_id = ?
        ORDER BY total DESC, user_id ASC
        LIMIT ?
    `).all(guildId, safeLimit);
}

module.exports = {
    createUser,
    getUser: getBalance,
    getBalance,
    getOrCreate,
    setMoney,
    setWallet: (userId, guildId, amount) => {
        const user = getOrCreate(userId, guildId);
        setMoney(userId, guildId, amount, user.bank);
    },
    setBank: (userId, guildId, amount) => {
        const user = getOrCreate(userId, guildId);
        setMoney(userId, guildId, user.wallet, amount);
    },
    addWallet: (userId, guildId, amount) => change("wallet", userId, guildId, amount),
    addMoney: (userId, guildId, amount) => change("wallet", userId, guildId, amount),
    removeWallet: (userId, guildId, amount) => change("wallet", userId, guildId, -amount),
    addBank: (userId, guildId, amount) => change("bank", userId, guildId, amount),
    removeBank: (userId, guildId, amount) => change("bank", userId, guildId, -amount),
    setLastDaily: (userId, guildId, time) => setCooldown("last_daily", userId, guildId, time),
    setLastWork: (userId, guildId, time) => setCooldown("last_work", userId, guildId, time),
    transferWallet,
    deposit,
    withdraw,
    getLeaderboard
};
