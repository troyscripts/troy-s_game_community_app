"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "troy-business-"));
const defaults = require("../config/defaults");
defaults.Database.File = path.join(tmp, "test.sqlite");
defaults.Logging.Enabled = false;
defaults.Economy.Enabled = true;
const database = require("../database/database");
database.initializeDatabase();
const { db } = database,
  economy = require("../database/economy"),
  b = require("../database/business"),
  living = require("../database/living");
const g = "111111111111111111",
  owner = "222222222222222222",
  a = "333333333333333333",
  c = "444444444444444444";
let now = 1800000000000;
async function run() {
  for (const u of [owner, a, c]) economy.setMoney(u, g, 1000000, 1000000);
  b.change("buy", g, owner, "kopen", "kantoor", "bank", now);
  b.change("buy", g, owner, "kopen", "kantoor", "bank", now);
  assert.equal(economy.getBalance(owner, g).bank, 750000);
  assert.throws(() =>
    b.change("buy2", g, owner, "kopen", "kantoor", "bank", now),
  );
  assert.throws(() => b.change("buy", g, a, "kopen", "kantoor", "bank", now));
  assert.equal(b.settle(g, owner, "kantoor", now).earned, 0);
  now += b.HOUR;
  assert.equal(b.settle(g, owner, "kantoor", now).earned, 10000);
  assert.equal(b.settle(g, owner, "kantoor", now).earned, 0);
  now += 3 * b.HOUR;
  assert.equal(b.settle(g, owner, "kantoor", now).earned, 30000);
  for (let n = 2; n <= 5; n++)
    b.change("up" + n, g, owner, "upgrade", "kantoor", "bank", now);
  assert.equal(b.income(b.asset(g, owner, "kantoor")), 14000);
  assert.equal(b.asset(g, owner, "kantoor").invested, 450000);
  assert.throws(() =>
    b.change("up6", g, owner, "upgrade", "kantoor", "bank", now),
  );
  b.change("insurance", g, owner, "verzekeren", "kantoor", "bank", now);
  assert.equal(b.asset(g, owner, "kantoor").next_premium, now + b.WEEK);
  b.change("security", g, owner, "beveiliging", "kantoor", "bank", now);
  assert.equal(b.asset(g, owner, "kantoor").invested, 475000);
  now += b.WEEK;
  const settled = b.settle(g, owner, "kantoor", now);
  assert.equal(settled.premium, 47500);
  assert.equal(settled.earned, 168 * 14000);
  assert.equal(b.settle(g, owner, "kantoor", now).premium, 0);
  b.change("gear", g, a, "uitrusting", null, "bank", now);
  assert.equal(b.gear(g, a).level, 1);
  const h = b.createHeist("heist1", g, a, owner, "kantoor", "channel", now);
  b.join(h.id, g, c, now);
  b.join(h.id, g, c, now);
  assert.equal(b.crew(h.id).length, 2);
  assert.throws(() => b.join(h.id, g, owner, now));
  assert.throws(() => b.join(h.id, "other", c, now));
  assert.throws(() => b.resolve(h.id, g, c, now));
  const bank = economy.getBalance(owner, g).bank,
    total = economy.getBalance(a, g).bank + economy.getBalance(c, g).bank;
  const result = b.resolve(h.id, g, a, now, () => 0);
  assert.equal(result.loot, 4500);
  assert.equal(
    result.shares.reduce((n, s) => n + s.amount, 0),
    4500,
  );
  assert.equal(economy.getBalance(owner, g).bank, bank);
  assert.equal(
    economy.getBalance(a, g).bank + economy.getBalance(c, g).bank,
    total + 4500,
  );
  b.resolve(h.id, g, a, now, () => 0);
  assert.equal(
    economy.getBalance(a, g).bank + economy.getBalance(c, g).bank,
    total + 4500,
  );
  assert.throws(() =>
    b.createHeist("blocked", g, a, owner, "kantoor", "channel", now),
  );
  now += b.HOUR;
  b.change("cancelinsurance", g, owner, "opzeggen", "kantoor", "bank", now);
  economy.setMoney(owner, g, 0, 0);
  b.createHeist("heist2", g, a, owner, "kantoor", "channel", now);
  b.join("heist2", g, c, now);
  b.resolve("heist2", g, a, now, () => 0);
  assert.equal(economy.getBalance(owner, g).bank, -4500);
  now += b.HOUR;
  b.createHeist("heist3", g, a, owner, "kantoor", "channel", now);
  b.join("heist3", g, c, now);
  assert.equal(b.resolve("heist3", g, a, now, () => 99).loot, 0);
  now += b.HOUR;
  b.createHeist("expired", g, a, owner, "kantoor", "channel", now);
  assert.throws(() => b.join("expired", g, c, now + 120000));
  assert.throws(() => b.resolve("expired", g, a, now + 120000));
  b.cancel("expired");
  economy.setMoney(owner, g, 0, 0);
  const snapshot = JSON.stringify(b.asset(g, owner, "kantoor"));
  assert.throws(() =>
    b.change("poor", g, owner, "beveiliging", "kantoor", "bank", now),
  );
  assert.equal(JSON.stringify(b.asset(g, owner, "kantoor")), snapshot);
  const persistent = JSON.stringify({ assets: b.assets(), gear: b.gear(g, a) });
  require("../database/economyReset").resetEconomy(g);
  require("../database/progressReset").resetProgress(g);
  assert.equal(
    JSON.stringify({ assets: b.assets(), gear: b.gear(g, a) }),
    persistent,
  );
  economy.setMoney(owner, g, 20000, 0);
  living.move("home", g, owner, "starter", "koop", "wallet", now);
  const sale = living.sell("sale", g, owner);
  assert.equal(sale.refund, 11250);
  assert.equal(economy.getBalance(owner, g).bank, 11250);
  living.sell("sale", g, owner);
  assert.equal(economy.getBalance(owner, g).bank, 11250);
  assert.equal(living.home(g, owner), undefined);
  assert.equal(living.multiplier(g, owner), 1);
  assert.throws(() => living.sell("sale2", g, owner));
  for (const name of ["bedrijf", "heist", "makelaar"])
    require("../commands/economy/" + name).data.toJSON();
  assert.equal(require("../buttons/heist").customId, "heist");
  // Business roles use dedicated permissionless identities; retry keeps the saved purchase.
  const service = require("../services/business"),
    { PermissionsBitField } = require("discord.js");
  const cache = new Map(),
    memberRoles = new Map();
  let count = 0,
    failAdd = true;
  const guild = {
    id: g,
    members: {
      fetchMe: async () => ({ permissions: { has: () => true } }),
      fetch: async () => ({
        roles: {
          cache: memberRoles,
          add: async (id) => {
            if (failAdd) throw Error("retry");
            memberRoles.set(id, true);
          },
          remove: async (id) => memberRoles.delete(id),
        },
      }),
    },
    roles: {
      fetch: async (id) => cache.get(id),
      create: async (opts) => {
        const r = {
          id: "role" + ++count,
          editable: true,
          managed: false,
          permissions: new PermissionsBitField(opts.permissions),
        };
        cache.set(r.id, r);
        return r;
      },
    },
  };
  const roles = await service.ensureRoles(guild);
  assert.equal(count, 3);
  await assert.rejects(service.syncMember(guild, owner, roles));
  assert.ok(b.jobs().length);
  failAdd = false;
  await service.syncMember(guild, owner, roles);
  assert.equal(b.jobs().length, 0);
  assert.deepEqual([...memberRoles.keys()], [roles.kantoor.id]);
  await service.ensureRoles(guild);
  assert.equal(count, 3);
  // Exercise public sign-up after a private defer, button routing and payload localization.
  const uiGuild = "555555555555555555";
  const settings = require("../database/guildSettings");
  settings.initialize();
  settings.ensureGuild(uiGuild);
  economy.setMoney(owner, uiGuild, 0, 20000);
  b.change("ui-buy", uiGuild, owner, "kopen", "klein");
  const published = [];
  const message = {
    id: "message",
    guildId: uiGuild,
    async edit(p) {
      this.payload = p;
    },
  };
  const client = {
    channels: {
      fetch: async () => ({ messages: { fetch: async () => message } }),
    },
  };
  function interaction(user, strings = {}, customId) {
    return {
      id: "ui-" + Math.random(),
      guildId: uiGuild,
      guild: { id: uiGuild },
      channelId: "channel",
      user: { id: user },
      customId,
      message,
      isRepliable: () => true,
      options: {
        getString: (k) => strings[k] || null,
        getUser: () => ({ id: owner, bot: false }),
        getBoolean: () => true,
      },
      async deferReply(p) {
        assert.equal(p.flags, 64);
        this.ephemeral = true;
      },
      async editReply(p) {
        this.response = p;
        this.replied = true;
      },
      async followUp(p) {
        assert.ok(
          this.replied,
          "Resolve ephemeral deferred reply before public follow-up",
        );
        assert.equal(p.flags, 0);
        published.push(p);
        return message;
      },
    };
  }
  const ui = interaction(a, { soort: "klein" });
  await service.startHeist(client, ui);
  assert.equal(published.length, 1);
  assert.equal(b.heist(ui.id).message_id, "message");
  assert.ok(!/[\uE000-\uE002]/.test(published[0].content));
  await service.button(client, interaction(c, {}, "heist:join:" + ui.id));
  assert.equal(b.crew(ui.id).length, 2);
  await service.button(client, interaction(a, {}, "heist:run:" + ui.id));
  assert.equal(b.heist(ui.id).status, "done");
  assert.deepEqual(message.payload.components, []);
  require("../database/languages").set(uiGuild, a, "en");
  const offer = interaction(a);
  await service.broker(client, offer);
  assert.match(offer.response.content, /Business broker/);
  assert.ok(!/[\uE000-\uE002]/.test(offer.response.content));
  const reopened = new (require("better-sqlite3"))(defaults.Database.File);
  assert.equal(
    reopened
      .prepare("SELECT stage FROM business_assets WHERE guild_id=?")
      .get(g).stage,
    5,
  );
  reopened.close();
  console.log(
    "PASS: business payments, upgrades, catch-up, insurance, heist isolation/authorization/cooldowns/payout/idempotency/failure/expiry, reset preservation, home sale, role retry, persistence and command schemas.",
  );
}
run()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    database.closeDatabase();
    fs.rmSync(tmp, { recursive: true, force: true });
  });
