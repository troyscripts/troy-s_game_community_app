'use strict';
const { db } = require('./database');
db.exec(`CREATE TABLE IF NOT EXISTS honeypot_cases (
    id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, user_id TEXT NOT NULL,
    channel_id TEXT NOT NULL, action TEXT NOT NULL, status TEXT NOT NULL,
    reason TEXT NOT NULL, timeout_until INTEGER NOT NULL DEFAULT 0,
    previous_timeout INTEGER NOT NULL DEFAULT 0,
    log_channel TEXT, log_message TEXT, resolved_by TEXT, error TEXT,
    created_at INTEGER NOT NULL
)`);
db.exec(`CREATE TABLE IF NOT EXISTS honeypot_warnings (
    guild_id TEXT NOT NULL, channel_id TEXT NOT NULL, message_id TEXT NOT NULL,
    content TEXT NOT NULL, PRIMARY KEY(guild_id,channel_id)
)`);
const columns = new Set(db.prepare('PRAGMA table_info(honeypot_cases)').all().map(c=>c.name));
for (const name of ['source_guild','source_message']) {
    if (!columns.has(name)) db.exec(`ALTER TABLE honeypot_cases ADD COLUMN ${name} TEXT NOT NULL DEFAULT ''`);
}
module.exports = {
    warnings(guild) { return db.prepare('SELECT * FROM honeypot_warnings WHERE guild_id=?').all(guild); },
    warning(guild,channel,message,content) { db.prepare(`INSERT INTO honeypot_warnings VALUES (?,?,?,?)
        ON CONFLICT(guild_id,channel_id) DO UPDATE SET message_id=excluded.message_id,content=excluded.content`).run(guild,channel,message,content); },
    get(id) { return db.prepare('SELECT * FROM honeypot_cases WHERE id=?').get(id); },
    create(row) {
        db.prepare(`INSERT INTO honeypot_cases
        (id,guild_id,user_id,channel_id,action,status,reason,created_at,source_guild,source_message) VALUES (?,?,?,?,?,'pending',?,?,?,?)`)
            .run(row.id,row.guild_id,row.user_id,row.channel_id,row.action,row.reason,Date.now(),row.source_guild||row.guild_id,row.source_message||row.id);
    },
    active(id,until=0,previous=0) { db.prepare("UPDATE honeypot_cases SET status='active',timeout_until=?,previous_timeout=? WHERE id=?").run(until,previous,id); },
    failed(id,error) { db.prepare("UPDATE honeypot_cases SET status='failed',error=? WHERE id=?").run(String(error).slice(0,500),id); },
    log(id,channel,message) { db.prepare('UPDATE honeypot_cases SET log_channel=?,log_message=? WHERE id=?').run(channel,message,id); },
    resolve(id,user) { db.prepare("UPDATE honeypot_cases SET status='resolved',resolved_by=? WHERE id=?").run(user,id); }
};
