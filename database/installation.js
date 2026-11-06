const { db } = require('./database');
function ensure() {
    db.exec(`CREATE TABLE IF NOT EXISTS installation_progress (
        guild_id TEXT PRIMARY KEY, state TEXT NOT NULL
    )`);
}
function get(guildId) {
    ensure();
    const row = db.prepare('SELECT state FROM installation_progress WHERE guild_id=?').get(guildId);
    return row ? JSON.parse(row.state) : { current: null, done: [], skipped: [], revision: 0 };
}
function save(guildId, state) {
    ensure();
    state.revision++;
    db.prepare(`INSERT INTO installation_progress VALUES (?,?)
        ON CONFLICT(guild_id) DO UPDATE SET state=excluded.state`).run(guildId, JSON.stringify(state));
    return state;
}
module.exports = { get, save };
