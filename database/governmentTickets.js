const { db } = require('./database');
db.exec(`CREATE TABLE IF NOT EXISTS government_departments (
 guild TEXT NOT NULL, service TEXT NOT NULL, department TEXT NOT NULL, config TEXT NOT NULL,
 PRIMARY KEY(guild,service,department));
 CREATE TABLE IF NOT EXISTS government_tickets (
 channel TEXT PRIMARY KEY, guild TEXT NOT NULL, service TEXT NOT NULL, department TEXT NOT NULL,
 owner TEXT NOT NULL, access TEXT NOT NULL, claimed TEXT, status TEXT NOT NULL DEFAULT 'open');`);
module.exports = {
 get(g,s,d) { const row=db.prepare('SELECT config FROM government_departments WHERE guild=? AND service=? AND department=?').get(g,s,d); return row ? JSON.parse(row.config) : { roles:[], users:[], category:null, enabled:false }; },
 save(g,s,d,c) { db.prepare('INSERT OR REPLACE INTO government_departments VALUES (?,?,?,?)').run(g,s,d,JSON.stringify(c)); },
 ticket(g,c) { return db.prepare('SELECT * FROM government_tickets WHERE guild=? AND channel=?').get(g,c); },
 existing(g,s,d,u) { return db.prepare("SELECT * FROM government_tickets WHERE guild=? AND service=? AND department=? AND owner=? AND status='open'").get(g,s,d,u); },
 add(t) { db.prepare('INSERT INTO government_tickets(channel,guild,service,department,owner,access) VALUES (@channel,@guild,@service,@department,@owner,@access)').run(t); },
 claim(g,c,u) { return db.prepare("UPDATE government_tickets SET claimed=? WHERE guild=? AND channel=? AND claimed IS NULL AND status='open'").run(u,g,c).changes; },
 deleted(g,c) { db.prepare("UPDATE government_tickets SET status='deleted' WHERE guild=? AND channel=?").run(g,c); },
 close(g,c) { db.prepare("UPDATE government_tickets SET status='closed' WHERE guild=? AND channel=?").run(g,c); },
 remove(g,c) { db.prepare('DELETE FROM government_tickets WHERE guild=? AND channel=?').run(g,c); }
};
