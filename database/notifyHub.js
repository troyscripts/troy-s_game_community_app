const { randomUUID } = require('node:crypto');
function createStore(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS notify_hub_sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT, platform TEXT NOT NULL, account TEXT NOT NULL,
        resolved_id TEXT, checked_at INTEGER, attempted_at INTEGER, error TEXT, redirect INTEGER,
        revision INTEGER NOT NULL DEFAULT 0);
        CREATE UNIQUE INDEX IF NOT EXISTS notify_hub_identity ON notify_hub_sources(platform,resolved_id) WHERE resolved_id IS NOT NULL AND redirect IS NULL;
        CREATE TABLE IF NOT EXISTS notify_hub_aliases (platform TEXT NOT NULL, account TEXT NOT NULL, source INTEGER NOT NULL, PRIMARY KEY(platform,account));
        CREATE TABLE IF NOT EXISTS notify_hub_items (source INTEGER NOT NULL, item TEXT NOT NULL, payload TEXT NOT NULL, published INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 1, PRIMARY KEY(source,item));
        CREATE TABLE IF NOT EXISTS notify_hub_deliveries (key TEXT PRIMARY KEY, bot TEXT NOT NULL, token TEXT NOT NULL, state TEXT NOT NULL, discord_id TEXT, updated_at INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS notify_hub_receipts (key TEXT PRIMARY KEY, token TEXT NOT NULL, state TEXT NOT NULL, discord_id TEXT);`);
    const get = id => db.prepare('SELECT * FROM notify_hub_sources WHERE id=?').get(id);
    function find(platform, account) {
        return db.prepare('SELECT s.* FROM notify_hub_sources s JOIN notify_hub_aliases a ON a.source=s.id WHERE a.platform=? AND a.account=?').get(platform,account);
    }
    const register = db.transaction((platform, account) => {
        const previous = find(platform,account);
        if (previous) return {...previous,reused:true};
        if (db.prepare('SELECT COUNT(*) AS n FROM notify_hub_sources WHERE redirect IS NULL').get().n >= 5000) throw Error('De hub heeft het maximum van 5000 creators bereikt.');
        const id = Number(db.prepare('INSERT INTO notify_hub_sources(platform,account) VALUES(?,?)').run(platform,account).lastInsertRowid);
        db.prepare('INSERT INTO notify_hub_aliases VALUES(?,?,?)').run(platform,account,id);
        return {...get(id),reused:false};
    });
    const save = db.transaction((source, result, now) => {
        let current = get(source.id);
        if (current.redirect) return get(current.redirect);
        if (result.resolvedId) {
            const other = db.prepare('SELECT * FROM notify_hub_sources WHERE platform=? AND resolved_id=? AND redirect IS NULL').get(source.platform,result.resolvedId);
            if (other && other.id !== current.id) {
                db.prepare('INSERT OR IGNORE INTO notify_hub_items SELECT ?,item,payload,published,active FROM notify_hub_items WHERE source=?').run(other.id,current.id);
                db.prepare('DELETE FROM notify_hub_items WHERE source=?').run(current.id);
                db.prepare('UPDATE notify_hub_aliases SET source=? WHERE source=?').run(other.id,current.id);
                db.prepare('UPDATE notify_hub_sources SET redirect=? WHERE id=? OR redirect=?').run(other.id,current.id,current.id);
                current=other;
            } else db.prepare('UPDATE notify_hub_sources SET resolved_id=? WHERE id=?').run(result.resolvedId,current.id);
            if (source.platform === 'youtube') {
                // A channel-ID entry may already exist but not have completed its first check.
                const alias = find('youtube',result.resolvedId);
                if (alias && alias.id !== current.id) {
                    db.prepare('INSERT OR IGNORE INTO notify_hub_items SELECT ?,item,payload,published,active FROM notify_hub_items WHERE source=?').run(current.id,alias.id);
                    db.prepare('DELETE FROM notify_hub_items WHERE source=?').run(alias.id);
                    db.prepare('UPDATE notify_hub_aliases SET source=? WHERE source=?').run(current.id,alias.id);
                    db.prepare('UPDATE notify_hub_sources SET redirect=? WHERE id=? OR redirect=?').run(current.id,alias.id,alias.id);
                }
                db.prepare('INSERT OR REPLACE INTO notify_hub_aliases VALUES(?,?,?)').run('youtube',result.resolvedId,current.id);
            }
        }
        if (source.platform === 'twitch') db.prepare('UPDATE notify_hub_items SET active=0 WHERE source=?').run(current.id);
        const insert=db.prepare(`INSERT INTO notify_hub_items(source,item,payload,published) VALUES(?,?,?,?)
            ON CONFLICT(source,item) DO UPDATE SET payload=excluded.payload,published=excluded.published,active=1`);
        for (const item of result.items) insert.run(current.id,item.id,JSON.stringify(item),item.published);
        db.prepare('UPDATE notify_hub_sources SET checked_at=?,attempted_at=?,error=NULL,revision=revision+1 WHERE id=?').run(now,now,current.id);
        return get(current.id);
    });
    function receipt(key) {return db.prepare('SELECT * FROM notify_hub_receipts WHERE key=?').get(key);}
    function setReceipt(key,token,state,discordId=null) {
        db.prepare('INSERT INTO notify_hub_receipts VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET token=excluded.token,state=excluded.state,discord_id=excluded.discord_id').run(key,token,state,discordId);
    }
    const claim=db.transaction((key,bot,token) => {
        const old=db.prepare('SELECT * FROM notify_hub_deliveries WHERE key=?').get(key);
        if (old && old.state !== 'failed') {
            if(old.state==='sending' && Date.now()-old.updated_at>120000) {
                db.prepare("UPDATE notify_hub_deliveries SET state='uncertain' WHERE key=?").run(key);old.state='uncertain';
            }
            return {state:old.state==='sent'?'sent':'held',outcome:old.state};
        }
        db.prepare('INSERT INTO notify_hub_deliveries VALUES(?,?,?,?,NULL,?) ON CONFLICT(key) DO UPDATE SET bot=excluded.bot,token=excluded.token,state=excluded.state,discord_id=NULL,updated_at=excluded.updated_at').run(key,bot,token,'sending',Date.now());
        return {state:'claimed'};
    });
    function ack(key,bot,token,state,discordId) {
        const old=db.prepare('SELECT * FROM notify_hub_deliveries WHERE key=?').get(key);
        if (!old || old.bot !== bot || old.token !== token) return false;
        if (old.state===state) return true;
        if (old.state!=='sending' && !(old.state==='uncertain' && state==='sent')) return false;
        db.prepare('UPDATE notify_hub_deliveries SET state=?,discord_id=? WHERE key=?').run(state,discordId||null,key);
        return true;
    }
    return {get,find,register,save,claim,ack,receipt,setReceipt,newToken:randomUUID,
        recover() {db.prepare("UPDATE notify_hub_deliveries SET state='uncertain' WHERE state='sending'").run();},
        aliases(id) {return db.prepare('SELECT account FROM notify_hub_aliases WHERE source=? ORDER BY account LIMIT 100').all(id).map(r=>r.account);},
        history(key,bot) {db.prepare("INSERT OR IGNORE INTO notify_hub_deliveries VALUES(?,?,?,'sent',NULL,?)").run(key,bot,'import',Date.now());},
        fail(id,error,now) {db.prepare('UPDATE notify_hub_sources SET error=?,attempted_at=? WHERE id=? AND redirect IS NULL').run(String(error).slice(0,700),now,id);},
        items(id, offset, since) {return db.prepare('SELECT payload FROM notify_hub_items WHERE source=? AND active=1 AND published>=? ORDER BY published,item LIMIT 11 OFFSET ?').all(id,since,offset).map(r=>JSON.parse(r.payload));},
        hasItem(id,item) {return Boolean(db.prepare('SELECT 1 FROM notify_hub_items WHERE source=? AND item=? AND active=1').get(id,item));}
    };
}
module.exports={createStore};
