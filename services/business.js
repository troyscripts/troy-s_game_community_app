"use strict";
const {
  MessageFlags,
  PermissionFlagsBits: P,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const data = require("../database/business"),
  settings = require("../database/guildSettings"),
  logger = require("../utils/logger");
const { send, tr, pair } = require("../utils/localization");
const money = (n) => `€${Number(n).toLocaleString("nl-NL")}`;
const locks = new Map();
let timer;
function locked(g, fn) {
  const task = (locks.get(g) || Promise.resolve()).catch(() => {}).then(fn);
  locks.set(g, task);
  return task.finally(() => {
    if (locks.get(g) === task) locks.delete(g);
  });
}
function fail(s) {
  const e = new Error(tr(s));
  e.businessInput = true;
  throw e;
}
function enabled(i) {
  if (!settings.getGuildConfig(i.guildId).Economy.Enabled)
    fail(tr("De economie staat uit in deze server."));
}
const reply = (i, content) =>
  send(i, "editReply", { content, allowedMentions: { parse: [] } });
async function guard(i, fn) {
  await i.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    return await locked(i.guildId, fn);
  } catch (e) {
    if (!e.businessInput) logger.warn(`Bedrijven: ${e.stack || e}`);
    return reply(
      i,
      e.businessInput
        ? e.message
        : tr(
            "De actie kon niet volledig worden afgerond. Controleer je status; opgeslagen rollen worden automatisch hersteld.",
          ),
    );
  }
}
async function ensureRoles(guild) {
  const me = await guild.members.fetchMe();
  if (!me.permissions.has(P.ManageRoles))
    fail(tr("De bot heeft Rollen beheren nodig."));
  const result = {};
  for (const [k, t] of Object.entries(data.TYPES)) {
    const stored = data.roles(guild.id).find((r) => r.kind === k);
    let role = stored ? await guild.roles.fetch(stored.role_id) : null;
    if (!role) {
      role = await guild.roles.create({
        name: `Bedrijf · ${t.name}`,
        color: t.color,
        permissions: [],
        mentionable: false,
        reason: "Economy bedrijfsrollen",
      });
      data.setRole(guild.id, k, role.id);
    }
    if (
      role.managed ||
      role.id === guild.id ||
      !role.editable ||
      role.permissions.bitfield !== 0n
    )
      fail(
        tr(
          "Zet de botrol boven de bedrijfsrollen; bedrijfsrollen mogen geen extra rechten hebben.",
        ),
      );
    result[k] = role;
  }
  return result;
}
async function syncMember(guild, u, roles) {
  let member;
  try {
    member = await guild.members.fetch({ user: u, force: true });
  } catch (e) {
    if (Number(e.code) === 10007) {
      data.done(guild.id, u);
      return;
    }
    throw e;
  }
  for (const [k, r] of Object.entries(roles)) {
    const owns = !!data.asset(guild.id, u, k);
    if (owns && !member.roles.cache.has(r.id))
      await member.roles.add(r.id, "Bedrijfseigenaar");
    else if (!owns && member.roles.cache.has(r.id))
      await member.roles.remove(r.id, "Geen bedrijf van dit type");
  }
  data.done(guild.id, u);
}
const RULES =
  "Eén bedrijf per soort per speler. Automatisch elk volledig uur op je bank, eerste betaling na één uur; gemiste uren worden na herstart ingehaald. Vast inkomen zonder VIP-/woningbonus. Stadium 1–5: iedere upgrade +10% van het basisinkomen (maximaal +40%); prijs per upgrade 20% van de basisprijs. Beveiliging 0–5: per niveau 10% van de basisprijs. Uitrusting 0–5: volgende upgrade kost €2.500 × het nieuwe niveau. Verzekering: direct 10% van de waarde inclusief upgrades, daarna elke 7 dagen opnieuw tegen de actuele waarde. Vervolgpremies en onverzekerde overvalschade kunnen je bank negatief maken. Opzeggen stopt toekomstige premies zonder restitutie. Bedrijven, upgrades en verzekeringen blijven bij resets behouden.";
async function broker(client, i) {
  return guard(i, async () => {
    const g = i.guildId,
      u = i.user.id,
      a = i.options.getString("actie") || "aanbod",
      k = i.options.getString("soort");
    if (a === "aanbod")
      return reply(
        i,
        pair("🏢 **Bedrijvenmakelaar**\n", "🏢 **Business broker**\n") +
          Object.entries(data.TYPES)
            .map(([key, t]) =>
              pair(
                `**${t.name}** (${key}): ${money(t.price)} · ${money(t.income)}/uur · maximale buit ${money(t.loot)}`,
                `**${{ klein: "Small business", restaurant: "Restaurant", kantoor: "Office building" }[key]}** (${key}): ${money(t.price)} · ${money(t.income)}/hour · maximum loot ${money(t.loot)}`,
              ),
            )
            .join("\n") +
          "\n\n" +
          pair(
            RULES,
            "One business of each type per player. Automatic bank income every full hour, starting one hour after purchase; missed hours are caught up after restart. Fixed income without VIP/housing bonuses. Stages 1–5: each upgrade adds 10% of base income (maximum +40%) and costs 20% of base price. Security 0–5: each upgrade costs 10% of base price. Equipment 0–5: next upgrade costs €2,500 × the new level. Insurance costs 10% of the value including upgrades immediately and every 7 days at the current value. Renewal premiums and uninsured raid losses can make your bank balance negative. Cancelling ends future premiums without a refund. Businesses, upgrades and insurance survive resets.",
          ) +
          pair(
            "\n\nGebruik /bedrijf actie:kopen soort:… bevestigen:Ja.",
            "\n\nUse /bedrijf action:kopen type:… confirm:True.",
          ),
      );
    if (a === "status") {
      for (const r of data.assets(g).filter((r) => r.user_id === u))
        if (settings.getGuildConfig(g).Economy.Enabled)
          data.settle(g, u, r.kind);
      const rows = data.assets(g).filter((r) => r.user_id === u);
      return reply(
        i,
        pair("🏢 **Mijn bedrijven**\n", "🏢 **My businesses**\n") +
          (rows
            .map((r) =>
              pair(
                `**${data.TYPES[r.kind].name}** · stadium ${r.stage}/5 · beveiliging ${r.security}/5\nWaarde ${money(r.invested)} · inkomen ${money(data.income(r))}/uur · volgende betaling <t:${Math.floor(r.next_income / 1000)}:R>\nVerzekering: ${r.insured ? `${money(Math.ceil(r.invested * 0.1))}/week, volgende premie <t:${Math.floor(r.next_premium / 1000)}:f>` : "uit"}`,
                `**${{ klein: "Small business", restaurant: "Restaurant", kantoor: "Office building" }[r.kind]}** · stage ${r.stage}/5 · security ${r.security}/5\nValue ${money(r.invested)} · income ${money(data.income(r))}/hour · next payment <t:${Math.floor(r.next_income / 1000)}:R>\nInsurance: ${r.insured ? `${money(Math.ceil(r.invested * 0.1))}/week, next premium <t:${Math.floor(r.next_premium / 1000)}:f>` : "off"}`,
              ),
            )
            .join("\n\n") ||
            pair(
              "Je hebt nog geen bedrijf.",
              "You do not own a business yet.",
            )) +
          pair(
            `\n\nUitrusting: ${data.gear(g, u).level}/5 · volgende upgrade ${data.gear(g, u).level < 5 ? money((data.gear(g, u).level + 1) * 2500) : "maximum bereikt"}`,
            `\n\nEquipment: ${data.gear(g, u).level}/5 · next upgrade ${data.gear(g, u).level < 5 ? money((data.gear(g, u).level + 1) * 2500) : "maximum reached"}`,
          ),
      );
    }
    if (a !== "opzeggen") enabled(i);
    if (!i.options.getBoolean("bevestigen"))
      fail(
        tr(
          "Bekijk het aanbod en herhaal met bevestigen:Ja om de kosten te accepteren.",
        ),
      );
    let roles;
    if (a === "kopen") roles = await ensureRoles(i.guild);
    const result = data.change(
      i.id,
      g,
      u,
      a,
      k,
      i.options.getString("betaalmiddel") || "bank",
    );
    let note = "";
    if (a === "kopen") {
      try {
        await syncMember(i.guild, u, roles);
      } catch (e) {
        logger.warn(`Bedrijfsrol: ${e.message}`);
        note = pair(
          " Je bedrijfsrol wordt automatisch opnieuw verwerkt.",
          " Your business role will be retried automatically.",
        );
      }
    }
    return reply(
      i,
      pair(
        `✅ ${a} verwerkt. Betaald: ${money(result.cost)}.${result.level !== undefined ? ` Nieuw niveau: ${result.level}.` : ""}${note}`,
        `✅ ${a} completed. Paid: ${money(result.cost)}.${result.level !== undefined ? ` New level: ${result.level}.` : ""}${note}`,
      ),
    );
  });
}
function panel(h, closed = false) {
  const members = data.crew(h.id);
  return {
    content: pair(
      `🏦 **Heist — ${data.TYPES[h.kind].name}** van <@${h.target}>\nOrganisator: <@${h.leader}>\nDeelnemers (${members.length}/5): ${members.map((u) => `<@${u}>`).join(", ")}\nAanmelden tot <t:${Math.floor(h.deadline / 1000)}:R>. De organisator moet vóór die tijd uitvoeren (minimaal 2 spelers).\nMaximale buit: ${money(data.TYPES[h.kind].loot)}; beveiliging verlaagt de buit en slagingskans. Teamgrootte en uitrusting verhogen de kans. Elke deelnemer en het doelbedrijf krijgen na uitvoering 1 uur wachttijd. Buit wordt eerlijk verdeeld; het bedrijf blijft eigendom van de eigenaar.`,
      `🏦 **Heist — ${{ klein: "Small business", restaurant: "Restaurant", kantoor: "Office building" }[h.kind]}** owned by <@${h.target}>\nOrganizer: <@${h.leader}>\nParticipants (${members.length}/5): ${members.map((u) => `<@${u}>`).join(", ")}\nJoin until <t:${Math.floor(h.deadline / 1000)}:R>. The organizer must execute before then (minimum 2 players).\nMaximum loot: ${money(data.TYPES[h.kind].loot)}; security lowers loot and success chance. Team size and equipment improve the chance. Participants and the target business receive a 1-hour cooldown after execution. Loot is shared equally; ownership stays with the owner.`,
    ),
    allowedMentions: { parse: [] },
    components: [
      new ActionRowBuilder().addComponents(
        ...[
          ["join", tr("Aanmelden"), ButtonStyle.Primary],
          ["run", tr("Uitvoeren"), ButtonStyle.Success],
          ["cancel", tr("Annuleren"), ButtonStyle.Secondary],
        ].map(([a, label, style]) =>
          new ButtonBuilder()
            .setCustomId(`heist:${a}:${h.id}`)
            .setLabel(label)
            .setStyle(style)
            .setDisabled(closed),
        ),
      ),
    ],
  };
}
async function startHeist(client, i) {
  return guard(i, async () => {
    enabled(i);
    const target = i.options.getUser("eigenaar");
    if (target.bot) fail(tr("Kies een speler, geen bot."));
    const h = data.createHeist(
      i.id,
      i.guildId,
      i.user.id,
      target.id,
      i.options.getString("soort"),
      i.channelId,
    );
    try {
      await reply(i, tr("De openbare aanmelding wordt geplaatst…"));
      const message = await send(i, "followUp", {
        ...panel(h),
        flags: 0,
        fetchReply: true,
      });
      data.message(h.id, message.id);
    } catch (e) {
      data.cancel(h.id);
      throw e;
    }
    return reply(i, tr("✅ De openbare heist-aanmelding is geopend."));
  });
}
async function editPanel(client, h, payload) {
  if (!h.message_id) return;
  const channel = await client.channels.fetch(h.channel_id);
  const message = await channel.messages.fetch(h.message_id);
  await send(message, "edit", payload);
}
async function button(client, i) {
  return guard(i, async () => {
    enabled(i);
    const [, a, id] = i.customId.split(":");
    const h = data.heist(id);
    if (
      !h ||
      h.guild_id !== i.guildId ||
      h.channel_id !== i.channelId ||
      h.message_id !== i.message.id
    )
      fail(tr("Deze heistknop is niet geldig."));
    let payload;
    if (a === "join") {
      data.join(id, i.guildId, i.user.id);
      payload = panel(h);
      await reply(i, tr("✅ Je bent aangemeld."));
    } else if (a === "cancel") {
      if (h.leader !== i.user.id)
        fail(tr("Alleen de organisator kan annuleren."));
      if (h.status !== "open") fail(tr("Deze heist is al gesloten."));
      data.cancel(id);
      payload = { ...panel(h, true), content: tr("Heist geannuleerd.") };
      await reply(i, tr("Heist geannuleerd."));
    } else if (a === "run") {
      const r = data.resolve(id, i.guildId, i.user.id);
      payload = {
        content: r.cancelled
          ? "Heist gesloten."
          : pair(
              `🏦 **Heist ${r.success ? "geslaagd" : "mislukt"}** — ${data.TYPES[h.kind].name} van <@${h.target}>\nSlagingskans: ${r.chance}% · buit: ${money(r.loot)}\n${r.shares.map((s) => `<@${s.user}>: ${money(s.amount)}`).join("\n")}\n${r.success ? (r.insured ? "De verzekering heeft de eigenaar volledig gecompenseerd." : "De buit is afgeschreven van de bank van de eigenaar.") : "Er is geen geld gestolen."}`,
              `🏦 **Heist ${r.success ? "successful" : "failed"}** — ${h.kind}, owner <@${h.target}>\nSuccess chance: ${r.chance}% · loot: ${money(r.loot)}\n${r.shares.map((s) => `<@${s.user}>: ${money(s.amount)}`).join("\n")}\n${r.success ? (r.insured ? "Insurance fully compensated the owner." : "Loot was deducted from the owner’s bank.") : "No money was stolen."}`,
            ),
        components: [],
        allowedMentions: { parse: [] },
      };
      await reply(i, payload.content);
    } else fail(tr("Onbekende heistactie."));
    try {
      await editPanel(client, h, payload);
    } catch (e) {
      logger.warn(`Heistbericht bijwerken: ${e.message}`);
    }
  });
}
async function tick(client) {
  for (const r of data.assets()) {
    if (
      !client.guilds.cache.has(r.guild_id) ||
      !settings.getGuildConfig(r.guild_id).Economy.Enabled
    )
      continue;
    try {
      data.settle(r.guild_id, r.user_id, r.kind);
    } catch (e) {
      logger.warn(`Bedrijfsinkomen: ${e.message}`);
    }
  }
  for (const h of data.expired(Date.now())) {
    data.cancel(h.id);
    try {
      await editPanel(client, h, {
        ...panel(h, true),
        content: tr(
          "Heist verlopen. Er is geen geld afgeschreven; start opnieuw met /heist.",
        ),
      });
    } catch (e) {
      logger.warn(`Verlopen heist: ${e.message}`);
    }
  }
  for (const g of new Set(data.jobs().map((j) => j.guild_id))) {
    const guild = client.guilds.cache.get(g);
    if (!guild) continue;
    await locked(g, async () => {
      try {
        const roles = await ensureRoles(guild);
        for (const j of data.jobs().filter((j) => j.guild_id === g)) {
          try {
            await syncMember(guild, j.user_id, roles);
          } catch (e) {
            logger.warn(`Bedrijfsrol: ${e.message}`);
          }
        }
      } catch (e) {
        logger.warn(`Bedrijfsrollen: ${e.message}`);
      }
    });
  }
}
function start(client) {
  if (timer) return;
  let running = false,
    lastRepair = 0;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      if (Date.now() - lastRepair >= 300000) {
        for (const r of data.assets()) data.queue(r.guild_id, r.user_id);
        lastRepair = Date.now();
      }
      await tick(client);
    } catch (e) {
      logger.warn(`Bedrijven: ${e.message}`);
    } finally {
      running = false;
    }
  };
  timer = setInterval(run, 15000);
  timer.unref();
  void run();
}
module.exports = {
  broker,
  startHeist,
  button,
  start,
  tick,
  ensureRoles,
  syncMember,
  panel,
};
