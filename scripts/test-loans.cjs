"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "troy-loans-"));
const defaults = require("../config/defaults");
defaults.Database.File = path.join(tmp, "test.sqlite");
defaults.Logging.Enabled = false;
const database = require("../database/database");
database.initializeDatabase();
const e = require("../database/economy"),
  l = require("../database/loans");
const g = "guild",
  u = "user",
  now = Date.UTC(2026, 11, 31, 12);
try {
  e.setMoney(u, g, 0, 0);
  assert.equal(l.dueDate(now), Date.UTC(2027, 1, 28, 12));
  assert.equal(l.dueDate(Date.UTC(2027, 11, 31)), Date.UTC(2028, 1, 29));
  assert.throws(() => l.borrow("too-big", g, u, 500001, now));
  assert.throws(() => l.borrow("negative", g, u, -1, now));
  assert.throws(() => l.borrow("fraction", g, u, 1.1, now));
  const r = l.borrow("loan", g, u, 500000, now);
  assert.equal(r.total, 650000);
  assert.equal(e.getBalance(u, g).bank, 500000);
  l.borrow("loan", g, u, 500000, now);
  assert.equal(e.getBalance(u, g).bank, 500000);
  assert.throws(() => l.borrow("second", g, u, 1, now));
  assert.throws(() => l.borrow("loan", g, "other", 1, now));
  l.repay("repay", g, u, 100000);
  l.repay("repay", g, u, 100000);
  assert.equal(e.getBalance(u, g).bank, 400000);
  assert.equal(l.get(g, u).remaining, 550000);
  assert.throws(() => l.repay("too-much", g, u, 550001));
  assert.throws(() => l.repay("poor", g, u, 550000));
  assert.equal(l.collect(g, u, r.due - 1), 0);
  const before = JSON.stringify(l.get(g, u));
  require("../database/economyReset").resetEconomy(g);
  require("../database/progressReset").resetProgress(g);
  assert.equal(JSON.stringify(l.get(g, u)), before);
  assert.equal(l.collect(g, u, r.due), 550000);
  assert.equal(e.getBalance(u, g).bank, -550000);
  assert.equal(l.collect(g, u, r.due + 1), 0);
  assert.throws(() => l.borrow("debt", g, u, 10, r.due));
  e.setMoney(u, g, 0, 0);
  const small = l.borrow("new", g, u, 1, r.due);
  assert.equal(small.total, 2);
  e.addBank(u, g, 1);
  l.repay("full", g, u, 2);
  assert.equal(l.get(g, u).status, "paid");
  l.borrow("after-paid", g, u, 100, r.due);
  assert.equal(l.get(g, u).remaining, 130);
  assert.equal(l.get("other-guild", u), undefined);
  require("../commands/economy/bank").data.toJSON();
  console.log(
    "PASS: loan limits, fixed interest, rounding, calendar-month deadline/leap year, partial/full repayments, duplicate prevention, automatic collection/debt, reset preservation and server isolation.",
  );
} finally {
  database.closeDatabase();
  fs.rmSync(tmp, { recursive: true, force: true });
}
