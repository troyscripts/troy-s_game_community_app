"use strict";
const { db } = require("./database");
const economy = require("./economy");
const { tr } = require("../utils/localization");
const LIMIT = 500000;
db.exec(`CREATE TABLE IF NOT EXISTS bank_loans (
 guild_id TEXT NOT NULL,user_id TEXT NOT NULL,principal INTEGER NOT NULL,total INTEGER NOT NULL,
 remaining INTEGER NOT NULL,created_at INTEGER NOT NULL,due_at INTEGER NOT NULL,status TEXT NOT NULL,
 PRIMARY KEY(guild_id,user_id));
 CREATE TABLE IF NOT EXISTS bank_loan_receipts(id TEXT PRIMARY KEY,guild_id TEXT,user_id TEXT,result TEXT);`);
function fail(text) {
  const e = new Error(tr(text));
  e.loanInput = true;
  throw e;
}
const get = (g, u) =>
  db
    .prepare("SELECT * FROM bank_loans WHERE guild_id=? AND user_id=?")
    .get(g, u);
// Calendar months with end-of-month clamping, retaining the UTC time of day.
function dueDate(now) {
  const d = new Date(now),
    day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 2);
  const last = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.getTime();
}
function once(id, g, u, fn) {
  const old = db.prepare("SELECT * FROM bank_loan_receipts WHERE id=?").get(id);
  if (old) {
    if (old.guild_id !== g || old.user_id !== u)
      fail("Deze actie is niet van jou.");
    return JSON.parse(old.result);
  }
  const result = fn();
  db.prepare("INSERT INTO bank_loan_receipts VALUES (?,?,?,?)").run(
    id,
    g,
    u,
    JSON.stringify(result),
  );
  return result;
}
const collect = db.transaction((g, u, now = Date.now()) => {
  const row = get(g, u);
  if (!row || row.status !== "open" || row.due_at > now) return 0;
  economy.removeBank(u, g, row.remaining);
  db.prepare(
    "UPDATE bank_loans SET remaining=0,status='collected' WHERE guild_id=? AND user_id=?",
  ).run(g, u);
  return row.remaining;
});
const borrow = db.transaction((id, g, u, amount, now = Date.now()) =>
  once(id, g, u, () => {
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > LIMIT)
      fail("Kies een leenbedrag van €1 tot en met €500.000.");
    const old = get(g, u);
    if (old?.status === "open")
      fail("Los eerst je bestaande lening volledig af.");
    if (economy.getOrCreate(u, g).bank < 0)
      fail("Je kunt geen nieuwe lening afsluiten met een negatief banksaldo.");
    const total = amount + Math.ceil((amount * 30) / 100),
      due = dueDate(now);
    economy.addBank(u, g, amount);
    db.prepare(
      `INSERT INTO bank_loans VALUES (?,?,?,?,?,?,?,'open') ON CONFLICT(guild_id,user_id)
 DO UPDATE SET principal=excluded.principal,total=excluded.total,remaining=excluded.remaining,created_at=excluded.created_at,due_at=excluded.due_at,status='open'`,
    ).run(g, u, amount, total, total, now, due);
    return { amount, total, due };
  }),
);
const repay = db.transaction((id, g, u, amount) =>
  once(id, g, u, () => {
    const row = get(g, u);
    if (!row || row.status !== "open") fail("Je hebt geen openstaande lening.");
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > row.remaining)
      fail(
        "Kies een positief aflosbedrag dat niet hoger is dan je resterende schuld.",
      );
    if (economy.getOrCreate(u, g).bank < amount)
      fail("Onvoldoende banksaldo om dit bedrag af te lossen.");
    economy.removeBank(u, g, amount);
    const remaining = row.remaining - amount;
    db.prepare(
      "UPDATE bank_loans SET remaining=?,status=? WHERE guild_id=? AND user_id=?",
    ).run(remaining, remaining ? "open" : "paid", g, u);
    return { amount, remaining };
  }),
);
module.exports = {
  LIMIT,
  get,
  dueDate,
  borrow,
  repay,
  collect,
  due: (now = Date.now()) =>
    db
      .prepare("SELECT * FROM bank_loans WHERE status='open' AND due_at<=?")
      .all(now),
};
