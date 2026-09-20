const { db } = require("./database");

// Keep ticket migrations next to the code that requires them. This also repairs
// installations where tickets.js was updated but database.js was left unchanged.
let schemaReady = false;
function ensureTicketSchema() {
    if (schemaReady) return;
    db.transaction(() => {
        db.exec(`CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL, user_id TEXT NOT NULL,
            channel_id TEXT UNIQUE NOT NULL,
            category TEXT NOT NULL DEFAULT 'support', claimed_by TEXT,
            status TEXT NOT NULL DEFAULT 'open',
            created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
            closed_at INTEGER
        )`);
        const columns = new Set(db.prepare('PRAGMA table_info(tickets)').all().map(column => column.name));
        for (const [name, type] of [
            ['staff_thread_id', 'TEXT'],
            ['staff_roles_json', 'TEXT'],
            ['transcript_dm_sent_at', 'INTEGER']
        ]) {
            if (!columns.has(name)) db.exec(`ALTER TABLE tickets ADD COLUMN ${name} ${type}`);
        }
    }).immediate();
    schemaReady = true;
}

function createTicket({ guildId, userId, channelId, category = "support" }) {
    const result = db.prepare(`
        INSERT INTO tickets (guild_id, user_id, channel_id, category, status)
        VALUES (?, ?, ?, ?, 'open')
    `).run(guildId, userId, channelId, category);

    return result.lastInsertRowid;
}

function getTicket(channelId) {
    return db.prepare(
        "SELECT * FROM tickets WHERE channel_id = ?"
    ).get(channelId);
}

function getOpenTicket(userId, guildId) {
    return db.prepare(`
        SELECT * FROM tickets
        WHERE user_id = ? AND guild_id = ? AND status = 'open'
        ORDER BY created_at DESC LIMIT 1
    `).get(userId, guildId);
}

function getOpenTicketCount(userId, guildId) {
    return db.prepare(`
        SELECT COUNT(*) AS amount FROM tickets
        WHERE user_id = ? AND guild_id = ? AND status = 'open'
    `).get(userId, guildId).amount;
}

function claimTicket({ channelId, staffId }) {
    return db.prepare(`
        UPDATE tickets SET claimed_by = ?
        WHERE channel_id = ? AND status = 'open' AND claimed_by IS NULL
    `).run(staffId, channelId);
}

function closeTicket(channelId) {
    return db.prepare(`
        UPDATE tickets
        SET status = 'closed', closed_at = strftime('%s','now')
        WHERE channel_id = ?
    `).run(channelId);
}

function reopenTicket(channelId) {
    return db.prepare(`
        UPDATE tickets
        SET status = 'open', closed_at = NULL
        WHERE channel_id = ?
    `).run(channelId);
}

function deleteTicket(channelId) {
    return db.prepare(
        "DELETE FROM tickets WHERE channel_id = ?"
    ).run(channelId);
}

function getOpenTickets(guildId) {
    return db.prepare(`
        SELECT * FROM tickets
        WHERE guild_id = ? AND status = 'open'
        ORDER BY created_at ASC
    `).all(guildId);
}

function getUserTickets(userId, guildId) {
    return db.prepare(`
        SELECT * FROM tickets
        WHERE user_id = ? AND guild_id = ?
        ORDER BY created_at DESC
    `).all(userId, guildId);
}

function setStaffThread(channelId, threadId, roles) {
    return db.prepare("UPDATE tickets SET staff_thread_id=?, staff_roles_json=? WHERE channel_id=?").run(threadId, JSON.stringify(roles), channelId);
}
function markTranscriptSent(channelId) {
    return db.prepare("UPDATE tickets SET transcript_dm_sent_at=strftime('%s','now') WHERE channel_id=?").run(channelId);
}
module.exports = {
    setStaffThread, markTranscriptSent,
    createTicket,
    getTicket,
    getOpenTicket,
    getOpenTicketCount,
    claimTicket,
    closeTicket,
    reopenTicket,
    deleteTicket,
    getOpenTickets,
    getUserTickets
};

// Verify before the first ticket operation, before Discord channels/threads are
// created. A failed migration remains retryable and never resets existing data.
for (const [name, operation] of Object.entries(module.exports)) {
    module.exports[name] = (...args) => {
        ensureTicketSchema();
        return operation(...args);
    };
}
module.exports.ensureTicketSchema = ensureTicketSchema;
