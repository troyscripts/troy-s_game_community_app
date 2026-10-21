'use strict';
// Kept separate from economy balances: every existing reset preserves these tables.
const { db } = require('./database');
const economy = require('./economy');
const { tr } = require('../utils/localization');
const upgrades = require('../config/housingUpgrades');
const DAY = 86400000;
const HOMES = {
    starter: { name: 'Starterwoning', role: 'starterwoning', rent: 500, price: 15000, bonus: 0.5,
        description: 'Een kleine woonkamer met open keuken en een kleine slaapkamer.' },
    luxe: { name: 'Luxe woning', role: 'luxe woning', rent: 2000, price: 75000, bonus: 1,
        description: 'Een riante woonkamer, een riante leefkeuken en twee slaapkamers.' },
    villa: { name: 'Luxe villa', role: 'luxe villa', rent: 7500, price: 250000, bonus: 2,
        description: 'Een gigantische woonkamer met bar, een leefkeuken met kookeiland en een binnen-golfslagbad met sluis naar het buitenbad met prachtige tikibar.' }
};
const PRODUCTS = {
    water: { name: 'Water', price: 5 }, cola: { name: 'Cola', price: 8 },
    koffie: { name: 'Koffie', price: 10 }, appel: { name: 'Appel', price: 5 },
    broodje: { name: 'Broodje kaas', price: 15 }, hamburger: { name: 'Hamburger', price: 25 },
    pizza: { name: 'Pizza', price: 35 }
};
function init() {
    db.exec(`CREATE TABLE IF NOT EXISTS living_homes (
        guild_id TEXT NOT NULL, user_id TEXT NOT NULL, home TEXT NOT NULL,
        mode TEXT NOT NULL, paid_price INTEGER NOT NULL, next_rent INTEGER NOT NULL,
        PRIMARY KEY(guild_id,user_id));
    CREATE TABLE IF NOT EXISTS living_roles (
        guild_id TEXT NOT NULL, home TEXT NOT NULL, role_id TEXT NOT NULL,
        PRIMARY KEY(guild_id,home));
    CREATE TABLE IF NOT EXISTS living_inventory (
        guild_id TEXT NOT NULL, user_id TEXT NOT NULL, product TEXT NOT NULL, quantity INTEGER NOT NULL,
        PRIMARY KEY(guild_id,user_id,product));
    CREATE TABLE IF NOT EXISTS living_receipts (
        request_id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, user_id TEXT NOT NULL, result TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS living_role_jobs (
        guild_id TEXT NOT NULL, user_id TEXT NOT NULL, PRIMARY KEY(guild_id,user_id));`);
    const columns = new Set(db.prepare('PRAGMA table_info(living_homes)').all().map(c => c.name));
    for (const name of ['kitchen_level', 'income_level']) {
        if (!columns.has(name)) db.exec(`ALTER TABLE living_homes ADD COLUMN ${name} INTEGER NOT NULL DEFAULT 0`);
    }
}
init();
const home = (g,u) => db.prepare('SELECT * FROM living_homes WHERE guild_id=? AND user_id=?').get(g,u);
const inventory = (g,u) => db.prepare('SELECT * FROM living_inventory WHERE guild_id=? AND user_id=? AND quantity>0').all(g,u);
const roles = g => db.prepare('SELECT * FROM living_roles WHERE guild_id=?').all(g);
const queue = (g,u) => db.prepare('INSERT OR IGNORE INTO living_role_jobs VALUES (?,?)').run(g,u);
function fail(text) { const error = new Error(tr(text)); error.livingInput = true; throw error; }
function validSource(source) { if (!['wallet','bank'].includes(source)) fail('Ongeldig betaalmiddel.'); }
function debit(g,u,amount,source) {
    validSource(source);
    if (!Number.isSafeInteger(amount) || amount < 0) fail('Ongeldig bedrag.');
    const balance = economy.getOrCreate(u,g);
    if (balance[source] < amount) fail('Je hebt onvoldoende saldo op het gekozen betaalmiddel.');
    if (source === 'wallet') economy.removeWallet(u,g,amount); else economy.removeBank(u,g,amount);
}
function once(id,g,u,fn) {
    const previous = db.prepare('SELECT * FROM living_receipts WHERE request_id=?').get(id);
    if (previous) {
        if (previous.guild_id !== g || previous.user_id !== u) fail('Deze actie is niet van jou.');
        return JSON.parse(previous.result);
    }
    const result = fn();
    db.prepare('INSERT INTO living_receipts VALUES (?,?,?,?)').run(id,g,u,JSON.stringify(result));
    return result;
}
// Rent never deletes a home. Catch up missed periods once, even after downtime.
const collectRent = db.transaction((g,u,now = Date.now()) => {
    const row = home(g,u);
    if (!row || row.mode !== 'huur' || row.next_rent > now) return 0;
    const periods = Math.floor((now-row.next_rent)/DAY)+1;
    const cost = periods*HOMES[row.home].rent;
    economy.removeBank(u,g,cost);
    db.prepare('UPDATE living_homes SET next_rent=next_rent+? WHERE guild_id=? AND user_id=?').run(periods*DAY,g,u);
    return cost;
});
const move = db.transaction((id,g,u,key,mode,source,now = Date.now()) => once(id,g,u,() => {
    if (!Object.hasOwn(HOMES,key) || !['koop','huur'].includes(mode)) fail('Ongeldige woning of woonvorm.');
    validSource(source);
    const old = home(g,u);
    if (old?.home === key && old?.mode === mode) fail('Je hebt deze woning en woonvorm al.');
    collectRent(g,u,now);
    const refund = old?.mode === 'koop' ? Math.floor(value(old)*0.15) : 0;
    // Sale and payment are atomic; insufficient funds roll back the entire move.
    if (refund) {
        if (source === 'wallet') economy.addWallet(u,g,refund); else economy.addBank(u,g,refund);
    }
    const cost = mode === 'koop' ? HOMES[key].price : HOMES[key].rent;
    debit(g,u,cost,source);
    db.prepare(`INSERT INTO living_homes (guild_id,user_id,home,mode,paid_price,next_rent) VALUES (?,?,?,?,?,?) ON CONFLICT(guild_id,user_id)
        DO UPDATE SET home=excluded.home,mode=excluded.mode,paid_price=excluded.paid_price,next_rent=excluded.next_rent,kitchen_level=0,income_level=0`)
        .run(g,u,key,mode,mode === 'koop' ? cost : 0,mode === 'huur' ? now+DAY : 0);
    queue(g,u);
    return {home:key,mode,cost,refund};
}));
const leave = db.transaction((id,g,u,now = Date.now()) => once(id,g,u,() => {
    const row = home(g,u);
    if (!row || row.mode !== 'huur') fail('Je hebt geen huurwoning om op te zeggen.');
    collectRent(g,u,now);
    db.prepare('DELETE FROM living_homes WHERE guild_id=? AND user_id=?').run(g,u);
    queue(g,u);
    return {cancelled:true};
}));
const sell = db.transaction((id,g,u) => once(id,g,u,() => {
    const row=home(g,u);
    if(!row || row.mode!=='koop') fail('Je hebt geen koopwoning om te verkopen.');
    const refund=Math.floor(value(row)*0.75);
    economy.addBank(u,g,refund);
    db.prepare('DELETE FROM living_homes WHERE guild_id=? AND user_id=?').run(g,u);
    queue(g,u);
    return {sold:true,refund};
}));
function value(row) {
    return row?.mode === 'koop' ? Math.floor(row.paid_price * 1.25 ** (row.kitchen_level + row.income_level)) : 0;
}
function quote(g,u,type) {
    const row = home(g,u);
    if (!row || row.mode !== 'koop') fail('Upgrades zijn alleen beschikbaar voor een koopwoning.');
    if (!['keuken','inkomen'].includes(type)) fail('Kies upgrade:keuken of upgrade:inkomen.');
    const field = type === 'keuken' ? 'kitchen_level' : 'income_level';
    const level = row[field];
    if (level >= 5) fail('Deze upgrade heeft al het maximale niveau 5.');
    if (!Number.isFinite(upgrades.PriceRate) || upgrades.PriceRate < 0) fail('Ongeldige upgradeprijs in de configuratie.');
    return {field, level:level+1, type, cost:Math.ceil(value(row)*upgrades.PriceRate),
        name:(type === 'keuken' ? upgrades.Kitchen : upgrades.Income)[level]};
}
const upgrade = db.transaction((id,g,u,type,source) => once(id,g,u,() => {
    const next = quote(g,u,type);
    debit(g,u,next.cost,source);
    db.prepare(`UPDATE living_homes SET ${next.field}=? WHERE guild_id=? AND user_id=?`).run(next.level,g,u);
    return {...next, value:value(home(g,u))};
}));
const groceries = db.transaction((id,g,u,key,quantity,source,use = false) => once(id,g,u,() => {
    if (!Object.hasOwn(PRODUCTS,key) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) fail('Kies een geldig product en een aantal van 1 tot 100.');
    if (use) {
        const result = db.prepare('UPDATE living_inventory SET quantity=quantity-? WHERE guild_id=? AND user_id=? AND product=? AND quantity>=?').run(quantity,g,u,key,quantity);
        if (!result.changes) fail('Je hebt niet genoeg van dit product in je voorraad.');
    } else {
        debit(g,u,PRODUCTS[key].price*quantity,source);
        db.prepare(`INSERT INTO living_inventory VALUES (?,?,?,?) ON CONFLICT(guild_id,user_id,product)
            DO UPDATE SET quantity=quantity+excluded.quantity`).run(g,u,key,quantity);
    }
    return {product:key,quantity,cost:use ? 0 : PRODUCTS[key].price*quantity,used:use};
}));
module.exports = {HOMES,PRODUCTS,DAY,home,value,quote,upgrade,inventory,roles,queue,move,leave,sell,groceries,collectRent,
    multiplier(g,u,kind='income') { const row=home(g,u); return row ? (1+HOMES[row.home].bonus) * 2 ** (kind === 'xp' ? row.kitchen_level : row.income_level) : 1; },
    setRole(g,key,id) { db.prepare('INSERT INTO living_roles VALUES (?,?,?) ON CONFLICT(guild_id,home) DO UPDATE SET role_id=excluded.role_id').run(g,key,id); },
    jobs() { return db.prepare('SELECT * FROM living_role_jobs').all(); },
    done(g,u) { db.prepare('DELETE FROM living_role_jobs WHERE guild_id=? AND user_id=?').run(g,u); },
    homes() { return db.prepare('SELECT * FROM living_homes').all(); }
};
