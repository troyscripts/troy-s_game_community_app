const { db } = require('./database');
let initialized = false;
function init() {
    if (initialized) return;
    db.exec(`CREATE TABLE IF NOT EXISTS giveaways (
        id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL,
        status TEXT NOT NULL, ends_at INTEGER NOT NULL, dirty INTEGER NOT NULL DEFAULT 1,
        data TEXT NOT NULL
    )`);
    initialized = true;
}
function decode(row) { return row ? { ...JSON.parse(row.data), id: Number(row.id) } : null; }
function create(data) {
    init();
    const result = db.prepare('INSERT INTO giveaways (guild_id,status,ends_at,data) VALUES (?,?,?,?)')
        .run(data.guildId, data.status, data.endsAt, JSON.stringify(data));
    return get(Number(result.lastInsertRowid));
}
function get(id) { init(); return decode(db.prepare('SELECT * FROM giveaways WHERE id = ?').get(id)); }
function save(giveaway, dirty = true) {
    init();
    db.prepare('UPDATE giveaways SET status=?, ends_at=?, dirty=?, data=? WHERE id=?')
        .run(giveaway.status, giveaway.endsAt, dirty ? 1 : 0, JSON.stringify(giveaway), giveaway.id);
}
function pending() {
    init();
    return db.prepare("SELECT * FROM giveaways WHERE dirty=1 OR (status='open' AND ends_at<=?)")
        .all(Date.now()).map(decode);
}
function remove(id) { init(); db.prepare('DELETE FROM giveaways WHERE id=?').run(id); }
module.exports = { create, get, save, pending, remove };
