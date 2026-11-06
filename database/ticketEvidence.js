const { db } = require('./database');
require('./tickets').ensureTicketSchema();
require('./governmentTickets');
db.exec(`CREATE TABLE IF NOT EXISTS ticket_evidence_messages (
 guild TEXT NOT NULL, channel TEXT NOT NULL, message TEXT NOT NULL, created INTEGER NOT NULL,
 deleted INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(guild,channel,message));
 CREATE TABLE IF NOT EXISTS ticket_evidence_versions (
 id INTEGER PRIMARY KEY AUTOINCREMENT, guild TEXT NOT NULL, channel TEXT NOT NULL, message TEXT NOT NULL,
 fingerprint TEXT NOT NULL, observed INTEGER NOT NULL, payload TEXT NOT NULL,
 UNIQUE(guild,channel,message,fingerprint));
 CREATE TABLE IF NOT EXISTS ticket_evidence_files (
 guild TEXT NOT NULL, channel TEXT NOT NULL, message TEXT NOT NULL, attachment TEXT NOT NULL,
 name TEXT NOT NULL, url TEXT NOT NULL, size INTEGER NOT NULL, bytes BLOB, error TEXT,
 PRIMARY KEY(guild,channel,message,attachment));
 CREATE INDEX IF NOT EXISTS idx_evidence_versions_channel ON ticket_evidence_versions(guild,channel,message);
 CREATE INDEX IF NOT EXISTS idx_evidence_files_channel ON ticket_evidence_files(guild,channel);`);
function tracked(g,c) {
 return Boolean(db.prepare('SELECT 1 FROM tickets WHERE guild_id=? AND (channel_id=? OR staff_thread_id=?)').get(g,c,c) ||
 db.prepare("SELECT 1 FROM government_tickets WHERE guild=? AND channel=? AND status!='deleted'").get(g,c));
}
const record = db.transaction((g,c,m,created,fingerprint,payload,files)=>{
 db.prepare('INSERT OR IGNORE INTO ticket_evidence_messages(guild,channel,message,created) VALUES (?,?,?,?)').run(g,c,m,created);
 db.prepare('INSERT OR IGNORE INTO ticket_evidence_versions(guild,channel,message,fingerprint,observed,payload) VALUES (?,?,?,?,?,?)').run(g,c,m,fingerprint,Date.now(),JSON.stringify(payload));
 for(const f of files) db.prepare(`INSERT INTO ticket_evidence_files(guild,channel,message,attachment,name,url,size) VALUES (?,?,?,?,?,?,?)
 ON CONFLICT(guild,channel,message,attachment) DO UPDATE SET url=excluded.url`).run(g,c,m,f.id,f.name,f.url,f.size);
});
module.exports={tracked,record,
 deleted(g,c,m,created) { db.prepare('INSERT INTO ticket_evidence_messages VALUES (?,?,?,?,?) ON CONFLICT(guild,channel,message) DO UPDATE SET deleted=excluded.deleted').run(g,c,m,created,Date.now()); },
 messages(g,c) {return db.prepare('SELECT * FROM ticket_evidence_messages WHERE guild=? AND channel=? ORDER BY created,message').all(g,c);},
 versions(g,c,m) {return db.prepare('SELECT * FROM ticket_evidence_versions WHERE guild=? AND channel=? AND message=? ORDER BY id').all(g,c,m);},
 files(g,c,m) {return m?db.prepare('SELECT * FROM ticket_evidence_files WHERE guild=? AND channel=? AND message=?').all(g,c,m):db.prepare('SELECT * FROM ticket_evidence_files WHERE guild=? AND channel=?').all(g,c);},
 file(g,c,m,a) {return db.prepare('SELECT * FROM ticket_evidence_files WHERE guild=? AND channel=? AND message=? AND attachment=?').get(g,c,m,a);},
 saved(f,bytes,error=null) {db.prepare('UPDATE ticket_evidence_files SET bytes=?,error=? WHERE guild=? AND channel=? AND message=? AND attachment=?').run(bytes,error,f.guild,f.channel,f.message,f.attachment);},
 channels() {return db.prepare(`SELECT guild_id AS guild,channel_id AS channel FROM tickets UNION SELECT guild_id,staff_thread_id FROM tickets WHERE staff_thread_id IS NOT NULL UNION SELECT guild,channel FROM government_tickets WHERE status!='deleted'`).all();}
};
