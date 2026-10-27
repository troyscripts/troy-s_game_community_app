// Uses the existing SQLite connection; no separate database service or credentials.
const { randomUUID } = require('node:crypto');
function createStore(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS broadcast_nonces (
            nonce TEXT PRIMARY KEY, expires_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS broadcast_nodes (
            bot_id TEXT PRIMARY KEY, guilds_json TEXT NOT NULL, seen_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS broadcast_messages (
            id TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE, body TEXT NOT NULL, created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS broadcast_deliveries (
            message_id TEXT NOT NULL, guild_id TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'pending',
            bot_id TEXT, token TEXT, discord_id TEXT, detail TEXT, updated_at INTEGER NOT NULL,
            PRIMARY KEY(message_id, guild_id)
        );
        CREATE TABLE IF NOT EXISTS broadcast_receipts (
            token TEXT PRIMARY KEY, message_id TEXT NOT NULL, guild_id TEXT NOT NULL,
            state TEXT NOT NULL, discord_id TEXT, detail TEXT
        );
    `);
    const api = {
        acceptNonce(nonce, expiresAt) {
            db.prepare('DELETE FROM broadcast_nonces WHERE expires_at < ?').run(Date.now());
            return db.prepare('INSERT OR IGNORE INTO broadcast_nonces VALUES (?,?)').run(nonce, expiresAt).changes === 1;
        },
        register(botId, guildIds) {
            db.prepare(`INSERT INTO broadcast_nodes VALUES (?, ?, ?) ON CONFLICT(bot_id)
                DO UPDATE SET guilds_json=excluded.guilds_json, seen_at=excluded.seen_at`)
                .run(botId, JSON.stringify([...new Set(guildIds)]), Date.now());
        },
        publish(requestId, body, allowedBots) {
            return db.transaction(() => {
                const existing = db.prepare('SELECT id FROM broadcast_messages WHERE request_id=?').get(requestId);
                if (existing) return { id: existing.id, ...api.summary(existing.id) };
                const id = randomUUID();
                const now = Date.now();
                db.prepare('INSERT INTO broadcast_messages VALUES (?, ?, ?, ?)').run(id, requestId, body, now);
                const guilds = new Set();
                for (const node of db.prepare('SELECT * FROM broadcast_nodes').all()) {
                    if (allowedBots.includes(node.bot_id)) for (const guildId of JSON.parse(node.guilds_json)) guilds.add(guildId);
                }
                const insert = db.prepare('INSERT INTO broadcast_deliveries(message_id,guild_id,updated_at) VALUES(?,?,?)');
                for (const guildId of guilds) insert.run(id, guildId, now);
                return { id, ...api.summary(id) };
            })();
        },
        // Atomic reservation per Discord server, including when two bots share it.
        claim(botId, guildIds) {
            return db.transaction(() => {
                const guildSet = new Set(guildIds);
                const row = db.prepare(`SELECT d.*, m.body FROM broadcast_deliveries d
                    JOIN broadcast_messages m ON m.id=d.message_id
                    WHERE d.state='pending' ORDER BY m.created_at, d.guild_id`).all().find(x => guildSet.has(x.guild_id));
                if (!row) return null;
                const token = randomUUID();
                db.prepare(`UPDATE broadcast_deliveries SET state='sending',bot_id=?,token=?,updated_at=?
                    WHERE message_id=? AND guild_id=?`).run(botId, token, Date.now(), row.message_id, row.guild_id);
                return { token, messageId: row.message_id, guildId: row.guild_id, body: row.body };
            })();
        },
        acknowledge(botId, receipt) {
            const changed = db.prepare(`UPDATE broadcast_deliveries SET state=?,discord_id=?,detail=?,updated_at=?
                WHERE token=? AND bot_id=? AND state='sending'`).run(receipt.state, receipt.discordId || null,
                (receipt.detail || '').slice(0,300), Date.now(), receipt.token, botId);
            if (changed.changes) return true;
            // Lost HTTP response: repeating an acknowledgement is safe.
            const row = db.prepare('SELECT state, bot_id FROM broadcast_deliveries WHERE token=?').get(receipt.token);
            return Boolean(row && row.bot_id === botId && row.state === receipt.state);
        },
        outstanding(botId) {
            return db.prepare("SELECT token, message_id AS messageId, guild_id AS guildId FROM broadcast_deliveries WHERE bot_id=? AND state='sending'").all(botId);
        },
        beginReceipt(item) {
            db.prepare("INSERT INTO broadcast_receipts(token,message_id,guild_id,state) VALUES(?,?,?,'sending')")
                .run(item.token, item.messageId, item.guildId);
        },
        finishReceipt(token, state, discordId, detail) {
            db.prepare('UPDATE broadcast_receipts SET state=?,discord_id=?,detail=? WHERE token=?')
                .run(state, discordId || null, (detail || '').slice(0,300), token);
        },
        receipts() {
            return db.prepare('SELECT token,state,discord_id AS discordId,detail FROM broadcast_receipts').all();
        },
        removeReceipt(token) { db.prepare('DELETE FROM broadcast_receipts WHERE token=?').run(token); },
        summary(id) {
            const result = { total: 0, pending: 0, sending: 0, sent: 0, skipped: 0, failed: 0, uncertain: 0 };
            for (const row of db.prepare('SELECT state,COUNT(*) AS count FROM broadcast_deliveries WHERE message_id=? GROUP BY state').all(id)) {
                result[row.state] = row.count; result.total += row.count;
            }
            return result;
        },
        nodes() { return db.prepare('SELECT bot_id AS botId, seen_at AS seenAt FROM broadcast_nodes').all(); }
    };
    return api;
}
module.exports = { createStore };
