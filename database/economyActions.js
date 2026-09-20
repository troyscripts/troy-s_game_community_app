const { db } = require('./database');
const economy = require('./economy');
const config = require('../config/config');
const { randomInt } = require('node:crypto');

// Additive tables: no existing balances or settings are reset.
db.exec(`
CREATE TABLE IF NOT EXISTS economy_actions (
    guild_id TEXT NOT NULL, user_id TEXT NOT NULL, action TEXT NOT NULL,
    last_at INTEGER NOT NULL, PRIMARY KEY(guild_id, user_id, action)
);
CREATE TABLE IF NOT EXISTS economy_invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL,
    sender_id TEXT NOT NULL, recipient_id TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK(amount > 0), reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','paid','declined','cancelled')),
    created_at INTEGER NOT NULL, closed_at INTEGER, payment_source TEXT,
    request_id TEXT NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS idx_invoice_recipient ON economy_invoices(guild_id, recipient_id, status, id);
CREATE INDEX IF NOT EXISTS idx_invoice_sender ON economy_invoices(guild_id, sender_id, status, id);
CREATE TABLE IF NOT EXISTS economy_robberies (
    request_id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, thief_id TEXT NOT NULL,
    target_id TEXT NOT NULL, success INTEGER NOT NULL, amount INTEGER NOT NULL, created_at INTEGER NOT NULL
);
`);

const RULES = Object.freeze({ stealCooldown: 30 * 60 * 1000, stealChance: 35,
    maxSteal: 500, fine: 100, minimumWallet: 100, invoiceCooldown: 30000, maxInvoice: 1000000 });
function checkEnabled() {
    if (!config.Economy.Enabled) throw new Error('De economie staat uit in deze server.');
}
function guardDifferent(a, b) {
    if (a === b) throw new Error('Je kunt deze actie niet op jezelf uitvoeren.');
}
function cooldown(guild, user, action, ms, now) {
    const row = db.prepare('SELECT last_at FROM economy_actions WHERE guild_id=? AND user_id=? AND action=?').get(guild,user,action);
    if (row && row.last_at + ms > now) throw new Error(`Wacht nog ${Math.ceil((row.last_at + ms - now)/1000)} seconden voor deze actie.`);
}
function mark(guild,user,action,now) {
    db.prepare(`INSERT INTO economy_actions VALUES (?,?,?,?) ON CONFLICT(guild_id,user_id,action) DO UPDATE SET last_at=excluded.last_at`).run(guild,user,action,now);
}
function move(sender, receiver, guild, amount, source) {
    if (!['wallet','bank'].includes(source) || !Number.isSafeInteger(amount) || amount <= 0) throw new Error('Ongeldig bedrag of betaalmiddel.');
    const a=economy.getOrCreate(sender,guild), b=economy.getOrCreate(receiver,guild);
    if (a[source] < amount) throw new Error(`Je hebt onvoldoende geld op je ${source === 'bank' ? 'bankrekening' : 'portemonnee'}.`);
    if (!Number.isSafeInteger(b[source]+amount)) throw new Error('Het saldo van de ontvanger is te hoog.');
    db.prepare(`UPDATE economy SET ${source}=${source}-? WHERE user_id=? AND guild_id=?`).run(amount,sender,guild);
    db.prepare(`UPDATE economy SET ${source}=${source}+? WHERE user_id=? AND guild_id=?`).run(amount,receiver,guild);
}

const steal=db.transaction((thief,target,guild,requestId) => {
    checkEnabled(); guardDifferent(thief,target);
    if (db.prepare('SELECT 1 FROM economy_robberies WHERE request_id=?').get(requestId)) throw new Error('Deze steelpoging is al verwerkt.');
    const now=Date.now(); cooldown(guild,thief,'steal',RULES.stealCooldown,now);
    const a=economy.getOrCreate(thief,guild);
    // Never create a victim's starter balance just to steal it.
    const b=economy.getBalance(target,guild);
    if (a.wallet<RULES.minimumWallet) throw new Error('Je hebt minstens €100 contant nodig om het risico te kunnen betalen.');
    if (!b || b.wallet<RULES.minimumWallet) throw new Error('Deze speler heeft minder dan €100 in de portemonnee.');
    const success=randomInt(100)<RULES.stealChance;
    const amount=success ? randomInt(1,Math.min(RULES.maxSteal,Math.floor(b.wallet*0.1))+1) : RULES.fine;
    move(success?target:thief,success?thief:target,guild,amount,'wallet');
    mark(guild,thief,'steal',now);
    db.prepare('INSERT INTO economy_robberies VALUES (?,?,?,?,?,?,?)').run(requestId,guild,thief,target,Number(success),amount,now);
    return {success,amount};
});
const createInvoice=db.transaction((sender,recipient,guild,amount,reason,requestId) => {
    checkEnabled(); guardDifferent(sender,recipient);
    if (!Number.isSafeInteger(amount) || amount<1 || amount>RULES.maxInvoice) throw new Error('Gebruik een heel bedrag tussen €1 en €1.000.000.');
    reason=String(reason).trim();
    if (!reason || reason.length>200) throw new Error('Geef een omschrijving van 1 tot 200 tekens.');
    if(db.prepare('SELECT 1 FROM economy_invoices WHERE request_id=?').get(requestId)) throw new Error('Deze rekening is al aangemaakt.');
    const now=Date.now(); cooldown(guild,sender,'invoice',RULES.invoiceCooldown,now);
    const count=db.prepare("SELECT COUNT(*) AS n FROM economy_invoices WHERE guild_id=? AND sender_id=? AND status='open'").get(guild,sender).n;
    if(count>=20) throw new Error('Je hebt al 20 openstaande verstuurde rekeningen.');
    const result=db.prepare('INSERT INTO economy_invoices (guild_id,sender_id,recipient_id,amount,reason,created_at,request_id) VALUES (?,?,?,?,?,?,?)').run(guild,sender,recipient,amount,reason,now,requestId);
    mark(guild,sender,'invoice',now);
    return Number(result.lastInsertRowid);
});
function getInvoice(guild,id,user) {
    const row=db.prepare('SELECT * FROM economy_invoices WHERE guild_id=? AND id=?').get(guild,id);
    if(!row || ![row.sender_id,row.recipient_id].includes(user)) throw new Error('Rekening niet gevonden of niet van jou.');
    return row;
}
const settleInvoice=db.transaction((guild,id,user,action,source='bank')=>{
    checkEnabled();
    const row=getInvoice(guild,id,user);
    if(row.status!=='open') throw new Error('Deze rekening is al afgehandeld.');
    if(!['paid','declined','cancelled'].includes(action)) throw new Error('Onbekende actie.');
    const allowed=action==='cancelled'?row.sender_id:row.recipient_id;
    if(user!==allowed) throw new Error(action==='cancelled'?'Alleen de afzender kan annuleren.':'Alleen de ontvanger kan betalen of weigeren.');
    if(action==='paid') move(user,row.sender_id,guild,row.amount,source);
    db.prepare('UPDATE economy_invoices SET status=?, closed_at=?, payment_source=? WHERE guild_id=? AND id=?').run(action,Date.now(),action==='paid'?source:null,guild,id);
    return {...row,status:action};
});
function listInvoices(guild,user,direction='received',page=1) {
    const field=direction==='sent'?'sender_id':'recipient_id';
    page=Math.max(1,Math.floor(Number(page)||1));
    return db.prepare(`SELECT * FROM economy_invoices WHERE guild_id=? AND ${field}=? ORDER BY id DESC LIMIT 10 OFFSET ?`).all(guild,user,(page-1)*10);
}
module.exports={RULES,steal,createInvoice,getInvoice,settleInvoice,listInvoices};
