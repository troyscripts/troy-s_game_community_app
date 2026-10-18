"use strict";
const { tr } = require("../utils/localization");
const { db } = require("./database");
const economy = require("./economy");
const { randomInt } = require("node:crypto");
const HOUR = 3600000,
  WEEK = 168 * HOUR;
const TYPES = {
  klein: {
    name: "Klein bedrijf",
    price: 10000,
    income: 500,
    loot: 1000,
    color: 0xcd7f32,
  },
  restaurant: {
    name: "Restaurant",
    price: 50000,
    income: 2000,
    loot: 3000,
    color: 0xc0c0c0,
  },
  kantoor: {
    name: "Kantoorgebouw",
    price: 250000,
    income: 10000,
    loot: 5000,
    color: 0xffd700,
  },
};
db.exec(`CREATE TABLE IF NOT EXISTS business_assets(guild_id TEXT,user_id TEXT,kind TEXT,stage INTEGER NOT NULL DEFAULT 1,security INTEGER NOT NULL DEFAULT 0,invested INTEGER NOT NULL,next_income INTEGER NOT NULL,insured INTEGER NOT NULL DEFAULT 0,next_premium INTEGER NOT NULL DEFAULT 0,last_raid INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(guild_id,user_id,kind));
CREATE TABLE IF NOT EXISTS business_gear(guild_id TEXT,user_id TEXT,level INTEGER NOT NULL DEFAULT 0,next_heist INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(guild_id,user_id));
CREATE TABLE IF NOT EXISTS business_roles(guild_id TEXT,kind TEXT,role_id TEXT,PRIMARY KEY(guild_id,kind));
CREATE TABLE IF NOT EXISTS business_role_jobs(guild_id TEXT,user_id TEXT,PRIMARY KEY(guild_id,user_id));
CREATE TABLE IF NOT EXISTS business_receipts(id TEXT PRIMARY KEY,guild_id TEXT,user_id TEXT,result TEXT);
CREATE TABLE IF NOT EXISTS business_heists(id TEXT PRIMARY KEY,guild_id TEXT,leader TEXT,target TEXT,kind TEXT,deadline INTEGER,status TEXT,channel_id TEXT,message_id TEXT,result TEXT);
CREATE TABLE IF NOT EXISTS business_crew(heist_id TEXT,user_id TEXT,PRIMARY KEY(heist_id,user_id));`);
function fail(message) {
  const e = new Error(tr(message));
  e.businessInput = true;
  throw e;
}
const asset = (g, u, k) =>
  db
    .prepare(
      "SELECT * FROM business_assets WHERE guild_id=? AND user_id=? AND kind=?",
    )
    .get(g, u, k);
const assets = (g) =>
  g
    ? db.prepare("SELECT * FROM business_assets WHERE guild_id=?").all(g)
    : db.prepare("SELECT * FROM business_assets").all();
const gear = (g, u) =>
  db
    .prepare("SELECT * FROM business_gear WHERE guild_id=? AND user_id=?")
    .get(g, u) || { level: 0, next_heist: 0 };
const heist = (id) =>
  db.prepare("SELECT * FROM business_heists WHERE id=?").get(id);
const crew = (id) =>
  db
    .prepare(
      "SELECT user_id FROM business_crew WHERE heist_id=? ORDER BY user_id",
    )
    .all(id)
    .map((r) => r.user_id);
const queue = (g, u) =>
  db.prepare("INSERT OR IGNORE INTO business_role_jobs VALUES (?,?)").run(g, u);
const income = (r) =>
  Math.round(TYPES[r.kind].income * (1 + (r.stage - 1) * 0.1));
function debit(g, u, n, source = "bank") {
  if (!["bank", "wallet"].includes(source)) fail(tr("Ongeldig betaalmiddel."));
  if (economy.getOrCreate(u, g)[source] < n) fail(tr("Onvoldoende saldo."));
  (source === "bank" ? economy.removeBank : economy.removeWallet)(u, g, n);
}
function once(id, g, u, fn) {
  const old = db.prepare("SELECT * FROM business_receipts WHERE id=?").get(id);
  if (old) {
    if (old.guild_id !== g || old.user_id !== u)
      fail(tr("Deze actie is niet van jou."));
    return JSON.parse(old.result);
  }
  const result = fn();
  db.prepare("INSERT INTO business_receipts VALUES (?,?,?,?)").run(
    id,
    g,
    u,
    JSON.stringify(result),
  );
  return result;
}
const settle = db.transaction((g, u, k, now = Date.now()) => {
  const r = asset(g, u, k);
  if (!r) return;
  let earned = 0,
    premium = 0;
  if (r.next_income <= now) {
    const n = Math.floor((now - r.next_income) / HOUR) + 1;
    earned = n * income(r);
    economy.addBank(u, g, earned);
    db.prepare(
      "UPDATE business_assets SET next_income=next_income+? WHERE guild_id=? AND user_id=? AND kind=?",
    ).run(n * HOUR, g, u, k);
  }
  if (r.insured && r.next_premium <= now) {
    const n = Math.floor((now - r.next_premium) / WEEK) + 1;
    premium = n * Math.ceil(r.invested * 0.1);
    economy.removeBank(u, g, premium);
    db.prepare(
      "UPDATE business_assets SET next_premium=next_premium+? WHERE guild_id=? AND user_id=? AND kind=?",
    ).run(n * WEEK, g, u, k);
  }
  return { earned, premium };
});
const change = db.transaction(
  (id, g, u, action, k, source = "bank", now = Date.now()) =>
    once(id, g, u, () => {
      if (action === "uitrusting") {
        const r = gear(g, u);
        if (r.level >= 5) fail(tr("Je uitrusting is al niveau 5."));
        const cost = (r.level + 1) * 2500;
        debit(g, u, cost, source);
        db.prepare(
          "INSERT INTO business_gear VALUES (?,?,?,0) ON CONFLICT(guild_id,user_id) DO UPDATE SET level=excluded.level",
        ).run(g, u, r.level + 1);
        return { cost, level: r.level + 1 };
      }
      if (!Object.hasOwn(TYPES, k)) fail(tr("Kies een geldig bedrijfstype."));
      if (action === "kopen") {
        if (asset(g, u, k)) fail(tr("Je bezit dit bedrijfstype al."));
        const cost = TYPES[k].price;
        debit(g, u, cost, source);
        db.prepare(
          "INSERT INTO business_assets(guild_id,user_id,kind,invested,next_income) VALUES (?,?,?,?,?)",
        ).run(g, u, k, cost, now + HOUR);
        queue(g, u);
        return { cost };
      }
      settle(g, u, k, now);
      const r = asset(g, u, k);
      if (!r) fail(tr("Je bezit dit bedrijf niet."));
      if (action === "upgrade" || action === "beveiliging") {
        const field = action === "upgrade" ? "stage" : "security";
        if (r[field] >= 5) fail(tr("Maximum niveau 5 bereikt."));
        const cost = Math.ceil(
          TYPES[k].price * (action === "upgrade" ? 0.2 : 0.1),
        );
        debit(g, u, cost, source);
        db.prepare(
          `UPDATE business_assets SET ${field}=${field}+1,invested=invested+? WHERE guild_id=? AND user_id=? AND kind=?`,
        ).run(cost, g, u, k);
        return { cost, level: r[field] + 1 };
      }
      if (action === "verzekeren") {
        if (r.insured) fail(tr("Dit bedrijf is al verzekerd."));
        const cost = Math.ceil(r.invested * 0.1);
        debit(g, u, cost, source);
        db.prepare(
          "UPDATE business_assets SET insured=1,next_premium=? WHERE guild_id=? AND user_id=? AND kind=?",
        ).run(now + WEEK, g, u, k);
        return { cost };
      }
      if (action === "opzeggen") {
        db.prepare(
          "UPDATE business_assets SET insured=0,next_premium=0 WHERE guild_id=? AND user_id=? AND kind=?",
        ).run(g, u, k);
        return { cost: 0 };
      }
      fail(tr("Ongeldige actie."));
    }),
);
function available(g, u, now) {
  if (gear(g, u).next_heist > now)
    fail(tr("Je kunt maar eenmaal per uur aan een heist deelnemen."));
  if (
    db
      .prepare(
        "SELECT 1 FROM business_crew c JOIN business_heists h ON h.id=c.heist_id WHERE h.guild_id=? AND c.user_id=? AND h.status='open' AND h.deadline>?",
      )
      .get(g, u, now)
  )
    fail(tr("Je zit al in een actieve heist."));
}
const createHeist = db.transaction(
  (id, g, u, target, k, channel, now = Date.now()) => {
    if (heist(id)) return heist(id);
    const r = asset(g, target, k);
    if (!r || target === u) fail(tr("Kies een bedrijf van een andere speler."));
    if (r.last_raid && r.last_raid + HOUR > now)
      fail(tr("Dit bedrijf is het afgelopen uur al overvallen."));
    available(g, u, now);
    if (
      db
        .prepare(
          "SELECT 1 FROM business_heists WHERE guild_id=? AND target=? AND kind=? AND status='open' AND deadline>?",
        )
        .get(g, target, k, now)
    )
      fail(tr("Voor dit bedrijf staat al een heist open."));
    db.prepare(
      "INSERT INTO business_heists VALUES (?,?,?,?,?,?,'open',?,NULL,NULL)",
    ).run(id, g, u, target, k, now + 120000, channel);
    db.prepare("INSERT INTO business_crew VALUES (?,?)").run(id, u);
    return heist(id);
  },
);
const join = db.transaction((id, g, u, now = Date.now()) => {
  const h = heist(id);
  if (!h || h.guild_id !== g || h.status !== "open" || h.deadline <= now)
    fail(tr("Deze heist is gesloten."));
  if (u === h.target) fail(tr("Je kunt je eigen bedrijf niet overvallen."));
  if (crew(id).includes(u)) return;
  available(g, u, now);
  if (crew(id).length >= 5) fail(tr("Deze heist heeft al vijf deelnemers."));
  db.prepare("INSERT INTO business_crew VALUES (?,?)").run(id, u);
});
const resolve = db.transaction(
  (id, g, u, now = Date.now(), roll = () => randomInt(100)) => {
    const h = heist(id);
    if (!h || h.guild_id !== g) fail(tr("Heist niet gevonden."));
    if (h.leader !== u)
      fail(tr("Alleen de organisator kan de heist uitvoeren."));
    if (h.status !== "open")
      return JSON.parse(h.result || '{"cancelled":true}');
    if (h.deadline <= now)
      fail(tr("De aanmeldtijd is verlopen; start een nieuwe heist."));
    const members = crew(id);
    if (members.length < 2) fail(tr("Er zijn minimaal twee deelnemers nodig."));
    const r = asset(g, h.target, h.kind);
    if (!r) fail(tr("Het bedrijf bestaat niet meer."));
    if (r.last_raid && r.last_raid + HOUR > now)
      fail(tr("Dit bedrijf is nog beschermd door de wachttijd."));
    for (const m of members)
      if (gear(g, m).next_heist > now)
        fail(tr("Een deelnemer heeft nog een wachttijd."));
    settle(g, h.target, h.kind, now);
    const power =
      members.reduce((sum, m) => sum + gear(g, m).level, 0) / members.length;
    const chance = Math.max(
      5,
      Math.min(90, 45 + (members.length - 2) * 8 + power * 8 - r.security * 12),
    );
    const success = roll() < chance,
      loot = success
        ? Math.floor(TYPES[h.kind].loot * (1 - r.security * 0.1))
        : 0;
    const shares = members.map((user, index) => ({
      user,
      amount:
        Math.floor(loot / members.length) +
        (index < loot % members.length ? 1 : 0),
    }));
    if (loot) {
      economy.removeBank(h.target, g, loot);
      if (r.insured) economy.addBank(h.target, g, loot);
      for (const s of shares) economy.addBank(s.user, g, s.amount);
    }
    for (const m of members)
      db.prepare(
        "INSERT INTO business_gear VALUES (?,?,0,?) ON CONFLICT(guild_id,user_id) DO UPDATE SET next_heist=excluded.next_heist",
      ).run(g, m, now + HOUR);
    db.prepare(
      "UPDATE business_assets SET last_raid=? WHERE guild_id=? AND user_id=? AND kind=?",
    ).run(now, g, h.target, h.kind);
    const result = { success, loot, shares, chance, insured: !!r.insured };
    db.prepare(
      "UPDATE business_heists SET status='done',result=? WHERE id=?",
    ).run(JSON.stringify(result), id);
    return result;
  },
);
module.exports = {
  TYPES,
  HOUR,
  WEEK,
  asset,
  assets,
  gear,
  income,
  settle,
  change,
  heist,
  crew,
  createHeist,
  join,
  resolve,
  queue,
  roles: (g) =>
    db.prepare("SELECT * FROM business_roles WHERE guild_id=?").all(g),
  setRole: (g, k, id) =>
    db
      .prepare(
        "INSERT INTO business_roles VALUES (?,?,?) ON CONFLICT(guild_id,kind) DO UPDATE SET role_id=excluded.role_id",
      )
      .run(g, k, id),
  jobs: () => db.prepare("SELECT * FROM business_role_jobs").all(),
  done: (g, u) =>
    db
      .prepare("DELETE FROM business_role_jobs WHERE guild_id=? AND user_id=?")
      .run(g, u),
  message: (id, m) =>
    db.prepare("UPDATE business_heists SET message_id=? WHERE id=?").run(m, id),
  cancel: (id) =>
    db
      .prepare(
        "UPDATE business_heists SET status='cancelled' WHERE id=? AND status='open'",
      )
      .run(id),
  expired: (now) =>
    db
      .prepare(
        "SELECT * FROM business_heists WHERE status='open' AND deadline<=?",
      )
      .all(now),
};
