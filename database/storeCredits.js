'use strict';
const { db } = require('./database');
const economy = require('./economy');
const config = require('../config/config');
const { tr } = require('../utils/localization');
const PRICE = 5000;
db.exec(`CREATE TABLE IF NOT EXISTS store_invoice_credits (
 id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, user_id TEXT NOT NULL,
 price INTEGER NOT NULL, source TEXT NOT NULL, created_at INTEGER NOT NULL,
 used_at INTEGER, invoice_id INTEGER
)`);
const buy = db.transaction((id,guild,user,source) => {
    const old=db.prepare('SELECT * FROM store_invoice_credits WHERE id=?').get(id);
    if(old){if(old.guild_id!==guild||old.user_id!==user)throw Error(tr('Deze bevestiging is niet van jou.'));return old;}
    if(!config.Economy.Enabled)throw Error(tr('De economie staat uit in deze server.'));
    if(!['wallet','bank'].includes(source))throw Error('Invalid payment source');
    economy.getOrCreate(user,guild);
    const result=db.prepare(`UPDATE economy SET ${source}=${source}-? WHERE guild_id=? AND user_id=? AND ${source}>=?`).run(PRICE,guild,user,PRICE);
    if(!result.changes)throw Error(tr('Onvoldoende spelgeld op je {0}. Je hebt €{1} nodig.',source==='bank'?tr('bankrekening'):tr('portemonnee'),PRICE));
    db.prepare('INSERT INTO store_invoice_credits (id,guild_id,user_id,price,source,created_at) VALUES (?,?,?,?,?,?)').run(id,guild,user,PRICE,source,Date.now());
    return db.prepare('SELECT * FROM store_invoice_credits WHERE id=?').get(id);
});
function available(guild,user){return db.prepare('SELECT COUNT(*) AS n FROM store_invoice_credits WHERE guild_id=? AND user_id=? AND used_at IS NULL').get(guild,user).n;}
function consume(guild,user,invoice,now){
    const credit=db.prepare('SELECT id FROM store_invoice_credits WHERE guild_id=? AND user_id=? AND used_at IS NULL ORDER BY created_at,id LIMIT 1').get(guild,user);
    if(!credit)throw Error(tr('Koop eerst een verplichte rekening voor €5.000 in /store.'));
    db.prepare('UPDATE store_invoice_credits SET used_at=?,invoice_id=? WHERE id=? AND used_at IS NULL').run(now,invoice,credit.id);
}
function history(guild,user){return db.prepare('SELECT * FROM store_invoice_credits WHERE guild_id=? AND user_id=? ORDER BY created_at DESC LIMIT 10').all(guild,user);}
module.exports={PRICE,buy,available,consume,history};
