'use strict';
const { db } = require('./database');
db.exec(`CREATE TABLE IF NOT EXISTS softmod_cases (
 id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, user_id TEXT NOT NULL,
 created_at INTEGER NOT NULL, status TEXT NOT NULL, payload TEXT NOT NULL
); CREATE INDEX IF NOT EXISTS idx_softmod_user ON softmod_cases(guild_id,user_id,created_at)`);
const decode = row => row ? JSON.parse(row.payload) : null;
module.exports = {
 get(id) { return decode(db.prepare('SELECT payload FROM softmod_cases WHERE id=?').get(id)); },
 save(row) { db.prepare(`INSERT INTO softmod_cases VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,payload=excluded.payload`)
   .run(row.id,row.guild,row.user,row.created,row.status,JSON.stringify(row)); },
 recent(guild,user,since) { return db.prepare("SELECT payload FROM softmod_cases WHERE guild_id=? AND user_id=? AND created_at>=? AND status!='rejected' ORDER BY created_at").all(guild,user,since).map(decode); }
};
