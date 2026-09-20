const { db } = require('./database');
let ready = false;
function ensure() {
    if (ready) return;
    db.exec(`CREATE TABLE IF NOT EXISTS bot_guild_avatars (
        guild_id TEXT PRIMARY KEY,
        image BLOB NOT NULL,
        mime_type TEXT NOT NULL,
        updated_by TEXT NOT NULL,
        updated_at INTEGER NOT NULL
    )`);
    ready = true;
}
function get(guildId) {
    ensure();
    return db.prepare('SELECT * FROM bot_guild_avatars WHERE guild_id=?').get(guildId);
}
function save(guildId, image, mimeType, userId) {
    ensure();
    db.prepare(`INSERT INTO bot_guild_avatars(guild_id,image,mime_type,updated_by,updated_at) VALUES(?,?,?,?,?)
        ON CONFLICT(guild_id) DO UPDATE SET image=excluded.image,mime_type=excluded.mime_type,updated_by=excluded.updated_by,updated_at=excluded.updated_at`)
        .run(guildId,image,mimeType,userId,Math.floor(Date.now()/1000));
}
function remove(guildId) {
    ensure();
    db.prepare('DELETE FROM bot_guild_avatars WHERE guild_id=?').run(guildId);
}
module.exports = { ensure, get, save, remove };
