const { db } = require('./database');
function init() {
    db.exec(`CREATE TABLE IF NOT EXISTS notify_creators (
        id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL,
        platform TEXT NOT NULL, account TEXT NOT NULL, channel_id TEXT NOT NULL,
        role_id TEXT, role_slot INTEGER, message TEXT NOT NULL DEFAULT '', resolved_id TEXT,
        baseline_at INTEGER, checked_at INTEGER, error TEXT,
        UNIQUE(guild_id, platform, account)
    );
    CREATE TABLE IF NOT EXISTS notify_items (
        creator_id INTEGER NOT NULL REFERENCES notify_creators(id) ON DELETE CASCADE,
        item_id TEXT NOT NULL, payload TEXT NOT NULL, sent_at INTEGER,
        PRIMARY KEY(creator_id, item_id)
    );
    CREATE TABLE IF NOT EXISTS notify_migrations (name TEXT PRIMARY KEY);`);
    if (!db.prepare('PRAGMA table_info(notify_items)').all().some(c => c.name === 'delivered')) db.exec('ALTER TABLE notify_items ADD COLUMN delivered INTEGER NOT NULL DEFAULT 0');
    if (!db.prepare('PRAGMA table_info(notify_items)').all().some(c => c.name === 'hub_blocked')) db.exec('ALTER TABLE notify_items ADD COLUMN hub_blocked TEXT');
    for (const column of ['hub_source INTEGER','hub_account TEXT']) {
        if (!db.prepare('PRAGMA table_info(notify_creators)').all().some(c => c.name === column.split(' ')[0])) db.exec(`ALTER TABLE notify_creators ADD COLUMN ${column}`);
    }
    if (!db.prepare('PRAGMA table_info(notify_creators)').all().some(c => c.name === 'role_slot')) db.exec('ALTER TABLE notify_creators ADD COLUMN role_slot INTEGER');
}
function list(guildId) { init(); return guildId ? db.prepare('SELECT c.*, (SELECT COUNT(*) FROM notify_items i WHERE i.creator_id=c.id AND i.hub_blocked IS NOT NULL) AS hub_blocked_count FROM notify_creators c WHERE guild_id=? ORDER BY id').all(guildId) : db.prepare('SELECT * FROM notify_creators ORDER BY id').all(); }
function get(id, guildId) { init(); return db.prepare('SELECT * FROM notify_creators WHERE id=? AND guild_id=?').get(id, guildId); }
function save(guildId, platform, account, channelId, roleId = null, message = '', roleSlot = null) {
    init();
    db.prepare(`INSERT INTO notify_creators(guild_id,platform,account,channel_id,role_id,message,role_slot) VALUES(?,?,?,?,?,?,?)
        ON CONFLICT(guild_id,platform,account) DO UPDATE SET channel_id=excluded.channel_id,role_id=excluded.role_id,message=excluded.message,role_slot=excluded.role_slot`).run(guildId,platform,account,channelId,roleId,message,roleSlot);
    return db.prepare('SELECT * FROM notify_creators WHERE guild_id=? AND platform=? AND account=?').get(guildId,platform,account);
}
function remove(id,guildId) { init(); return db.prepare('DELETE FROM notify_creators WHERE id=? AND guild_id=?').run(id,guildId).changes; }
function resolved(id,value) { db.prepare('UPDATE notify_creators SET resolved_id=? WHERE id=?').run(value,id); }
function ingest(row, items, now = Date.now()) {
    db.transaction(() => {
        const current = get(row.id,row.guild_id);
        if (!current) return;
        const first = current.baseline_at === null;
        const insert = db.prepare('INSERT OR IGNORE INTO notify_items(creator_id,item_id,payload,sent_at) VALUES(?,?,?,?)');
        if (current.platform === 'twitch') {
            const liveIds = new Set(items.map(item => item.id));
            for (const queued of pending(row.id)) {
                if (!liveIds.has(queued.item_id)) sent(row.id,queued.item_id,false);
            }
        }
        for (const item of items) {
            const historic = current.platform !== 'twitch' && (first || item.published < current.baseline_at);
            insert.run(row.id,item.id,JSON.stringify(item),historic ? now : null);
        }
        db.prepare('UPDATE notify_creators SET baseline_at=COALESCE(baseline_at,?),checked_at=?,error=NULL WHERE id=?').run(now,now,row.id);
    })();
}
function pending(id) { return db.prepare('SELECT * FROM notify_items WHERE creator_id=? AND sent_at IS NULL AND hub_blocked IS NULL ORDER BY rowid LIMIT 10').all(id); }
function sent(id,itemId,delivered=true) { db.prepare('UPDATE notify_items SET sent_at=?,delivered=? WHERE creator_id=? AND item_id=?').run(Date.now(),delivered?1:0,id,itemId); }
function error(id,message) { db.prepare('UPDATE notify_creators SET error=? WHERE id=?').run(message.slice(0,300),id); }
function seed(guildId, preset) {
    init();
    db.transaction(() => {
        const key = `preset:${preset.channelId}:v1`;
        if (db.prepare('SELECT 1 FROM notify_migrations WHERE name=?').get(key)) return;
        for (const {platform, account} of preset.creators) {
            db.prepare('INSERT OR IGNORE INTO notify_creators(guild_id,platform,account,channel_id) VALUES(?,?,?,?)').run(guildId,platform,account,preset.channelId);
        }
        db.prepare('INSERT INTO notify_migrations(name) VALUES(?)').run(key);
    })();
}
function seeded(channelId) { init(); return Boolean(db.prepare('SELECT 1 FROM notify_migrations WHERE name=?').get(`preset:${channelId}:v1`)); }
function hubLink(id, source, account) {
    init();db.prepare('UPDATE notify_creators SET hub_source=?,hub_account=? WHERE id=?').run(source,account,id);
}
function saveHub(guildId,platform,account,channelId,roleId,message,roleSlot,source) {
    init();
    const aliases=new Set([account,source.account,...(source.aliases||[])]);
    const existing=list(guildId).find(r=>r.platform===platform && (aliases.has(r.account) || aliases.has(r.hub_account)));
    const row=save(guildId,platform,existing?.account || account,channelId,roleId,message,roleSlot);
    hubLink(row.id,source.id,source.account);
    return get(row.id,guildId);
}
function recentSent(id) {init();return db.prepare('SELECT item_id FROM notify_items WHERE creator_id=? AND delivered=1 ORDER BY sent_at DESC LIMIT 100').all(id).map(r=>r.item_id);}
function block(id,itemId,error) {db.prepare('UPDATE notify_items SET hub_blocked=? WHERE creator_id=? AND item_id=?').run(String(error).slice(0,700),id,itemId);}
module.exports = {block,recentSent,hubLink,saveHub,seeded,init,list,get,save,remove,resolved,ingest,pending,sent,error,seed};
