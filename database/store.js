const { tr } = require("../utils/localization");
const { db } = require('./database');
const economy = require('./economy');
const PACKAGES = Object.freeze({ 1: 500, 3: 1300, 7: 2700 });
let initialized = false;
function init() {
    if (initialized) return;
    db.exec(`CREATE TABLE IF NOT EXISTS store_orders (
        id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, user_id TEXT NOT NULL, role_id TEXT NOT NULL,
        days INTEGER NOT NULL, price INTEGER NOT NULL, source TEXT NOT NULL,
        status TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER, note TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS store_one_pending ON store_orders(guild_id,user_id) WHERE status='pending';
    CREATE TABLE IF NOT EXISTS store_vip (
        guild_id TEXT NOT NULL, user_id TEXT NOT NULL, role_id TEXT NOT NULL,
        expires_at INTEGER NOT NULL, status TEXT NOT NULL,
        PRIMARY KEY(guild_id,user_id,role_id)
    );`);
    initialized = true;
}
function get(id) { init(); return db.prepare('SELECT * FROM store_orders WHERE id=?').get(id); }
function vip(guild, user, role) { init(); return db.prepare('SELECT * FROM store_vip WHERE guild_id=? AND user_id=? AND role_id=?').get(guild,user,role); }
function memberships(guild,user) { init(); return db.prepare("SELECT * FROM store_vip WHERE guild_id=? AND user_id=? AND status!='expired'").all(guild,user); }
function pending(guild,user) { init(); return db.prepare("SELECT * FROM store_orders WHERE guild_id=? AND user_id=? AND status='pending'").get(guild,user); }
function history(guild,user) { init(); return db.prepare('SELECT * FROM store_orders WHERE guild_id=? AND user_id=? ORDER BY created_at DESC,rowid DESC LIMIT 10').all(guild,user); }
const reserve = db.transaction((id,guild,user,role,days,source) => {
    init();
    const existing = get(id);
    if (existing) {
        if (existing.guild_id !== guild || existing.user_id !== user) throw new Error(tr("Deze bevestiging is niet van jou."));
        return existing;
    }
    if (!Object.hasOwn(PACKAGES,days) || !['wallet','bank'].includes(source)) throw new Error(tr("Ongeldig winkelpakket of betaalmiddel."));
    if (pending(guild,user)) throw new Error(tr("Een eerdere aankoop wordt nog verwerkt. Bekijk /store actie:status."));
    const price=PACKAGES[days];
    economy.getOrCreate(user,guild);
    const paid=db.prepare(`UPDATE economy SET ${source}=${source}-? WHERE guild_id=? AND user_id=? AND ${source}>=?`).run(price,guild,user,price);
    if (!paid.changes) throw new Error(tr("Onvoldoende spelgeld op je {0}. Je hebt €{1} nodig.", source==='bank'?tr("bankrekening"):tr("portemonnee"), price));
    db.prepare("INSERT INTO store_orders (id,guild_id,user_id,role_id,days,price,source,status,created_at) VALUES (?,?,?,?,?,?,?,'pending',?)")
        .run(id,guild,user,role,days,price,source,Date.now());
    return get(id);
});
const complete = db.transaction(id => {
    const o=get(id); if (!o || o.status!=='pending') return o;
    const prior=vip(o.guild_id,o.user_id,o.role_id);
    const until=Math.max(Date.now(),prior?.status==='active'?prior.expires_at:0)+o.days*86400000;
    db.prepare("INSERT INTO store_vip VALUES (?,?,?,?,'active') ON CONFLICT(guild_id,user_id,role_id) DO UPDATE SET expires_at=excluded.expires_at,status='active'")
        .run(o.guild_id,o.user_id,o.role_id,until);
    db.prepare("UPDATE store_orders SET status='complete',expires_at=? WHERE id=?").run(until,id);
    return get(id);
});
const refund = db.transaction((id,note) => {
    const o=get(id); if (!o || o.status!=='pending') return o;
    db.prepare(`UPDATE economy SET ${o.source}=${o.source}+? WHERE guild_id=? AND user_id=?`).run(o.price,o.guild_id,o.user_id);
    db.prepare("UPDATE store_orders SET status='refunded',note=? WHERE id=?").run(note,id);
    return get(id);
});
function expire(guild,user,role) { init(); db.prepare("UPDATE store_vip SET status='expired' WHERE guild_id=? AND user_id=? AND role_id=?").run(guild,user,role); }
function jobs() { init(); return db.prepare("SELECT guild_id,user_id FROM store_vip WHERE status='active' UNION SELECT guild_id,user_id FROM store_orders WHERE status='pending'").all(); }
module.exports={PACKAGES,get,vip,memberships,pending,history,reserve,complete,refund,expire,jobs};
