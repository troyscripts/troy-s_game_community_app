const { db } = require('./database');
function init() {
    db.exec(`CREATE TABLE IF NOT EXISTS selfrole_panels (
        id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL,
        name TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL,
        buttons_json TEXT NOT NULL DEFAULT '[]', UNIQUE(guild_id, name));
        CREATE TABLE IF NOT EXISTS selfrole_messages (
        guild_id TEXT NOT NULL, panel_id INTEGER NOT NULL, channel_id TEXT NOT NULL,
        message_id TEXT PRIMARY KEY);
        CREATE TABLE IF NOT EXISTS selfrole_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL,
        actor_id TEXT NOT NULL, action TEXT NOT NULL, details TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')));`);
}
function decode(row) { return row ? { ...row, buttons: JSON.parse(row.buttons_json) } : null; }
module.exports = {
    list(guild) { init(); return db.prepare('SELECT * FROM selfrole_panels WHERE guild_id=? ORDER BY id').all(guild).map(decode); },
    get(guild, id) { init(); return decode(db.prepare('SELECT * FROM selfrole_panels WHERE guild_id=? AND id=?').get(guild, id)); },
    create(guild, name, title, description) { init(); return Number(db.prepare('INSERT INTO selfrole_panels (guild_id,name,title,description) VALUES (?,?,?,?)').run(guild, name, title, description).lastInsertRowid); },
    save(p) { db.prepare('UPDATE selfrole_panels SET title=?,description=?,buttons_json=? WHERE guild_id=? AND id=?').run(p.title,p.description,JSON.stringify(p.buttons),p.guild_id,p.id); },
    messages(guild, id) { init(); return db.prepare('SELECT * FROM selfrole_messages WHERE guild_id=? AND panel_id=?').all(guild,id); },
    message(guild, message) { init(); return db.prepare('SELECT * FROM selfrole_messages WHERE guild_id=? AND message_id=?').get(guild,message); },
    track(guild, panel, channel, message) { init(); db.prepare('INSERT OR REPLACE INTO selfrole_messages VALUES (?,?,?,?)').run(guild,panel,channel,message); },
    untrack(guild, message) { db.prepare('DELETE FROM selfrole_messages WHERE guild_id=? AND message_id=?').run(guild,message); },
    remove(guild, id) { db.transaction(() => { db.prepare('DELETE FROM selfrole_messages WHERE guild_id=? AND panel_id=?').run(guild,id); db.prepare('DELETE FROM selfrole_panels WHERE guild_id=? AND id=?').run(guild,id); })(); },
    audit(guild, actor, action, details) { init(); db.prepare('INSERT INTO selfrole_audit (guild_id,actor_id,action,details) VALUES (?,?,?,?)').run(guild,actor,action,details); }
};
