"use strict";
const { MessageFlags } = require("discord.js");
const { tr, send } = require("../utils/localization");
const data = require("../database/loans"),
  settings = require("../database/guildSettings"),
  logger = require("../utils/logger");
const money = (n) => `€${Number(n).toLocaleString("nl-NL")}`;
let timer;
async function execute(client, i) {
  await i.deferReply({ flags: MessageFlags.Ephemeral });
  const reply = (content) =>
    send(i, "editReply", { content, allowedMentions: { parse: [] } });
  try {
    const g = i.guildId,
      u = i.user.id,
      a = i.options.getString("actie") || "informatie";
    // Enforce matured contracts before showing a balance or accepting a payment.
    data.collect(g, u);
    if (a === "informatie")
      return reply(
        tr(
          "🏦 **Bank — leningen**\nLeen €1 tot €500.000. Je betaalt eenmalig 30% rente, naar boven afgerond op hele euro’s. Bij €500.000 lenen betaal je €650.000 terug. Eén actieve lening per speler per server. De lening wordt direct op je bank gestort en moet binnen twee kalendermaanden terugbetaald zijn.\n\nLos tussentijds af met /bank actie:aflossen bedrag:… bevestigen:Ja. Eerder aflossen vermindert de vaste rente niet. Op de einddatum wordt het restant automatisch van je bank afgeschreven, ook als je saldo daardoor negatief wordt. Na botuitval gebeurt dit bij de eerstvolgende controle. Leningen blijven bij resets behouden. Met een negatief banksaldo kun je niet opnieuw lenen.\n\nGebruik /bank actie:lenen bedrag:… bevestigen:Ja.",
        ),
      );
    if (a === "status") {
      const r = data.get(g, u);
      return reply(
        !r
          ? tr("Je hebt nog geen lening afgesloten.")
          : tr(
              "🏦 **Mijn lening**\nGeleend: {0}\nTotaal inclusief rente: {1}\nNog af te lossen: {2}\nUiterste betaaldatum: <t:{3}:f>\nStatus: {4}",
              money(r.principal),
              money(r.total),
              money(r.remaining),
              Math.floor(r.due_at / 1000),
              tr(
                r.status === "open"
                  ? "Openstaand"
                  : r.status === "paid"
                    ? "Afgelost"
                    : "Automatisch geïncasseerd",
              ),
            ),
      );
    }
    if (!i.options.getBoolean("bevestigen"))
      return reply(
        tr("Lees eerst /bank actie:informatie en herhaal met bevestigen:Ja."),
      );
    if (a === "lenen") {
      if (!settings.getGuildConfig(g).Economy.Enabled)
        return reply(tr("De economie staat uit in deze server."));
      const r = data.borrow(i.id, g, u, i.options.getInteger("bedrag"));
      return reply(
        tr(
          "✅ {0} op je bank gestort. Je betaalt inclusief eenmalig 30% rente {1} terug, uiterlijk <t:{2}:f>. Het openstaande restant wordt op die datum automatisch geïncasseerd.",
          money(r.amount),
          money(r.total),
          Math.floor(r.due / 1000),
        ),
      );
    }
    if (a === "aflossen") {
      const r = data.repay(i.id, g, u, i.options.getInteger("bedrag"));
      return reply(
        tr(
          "✅ {0} afgelost vanaf je bank. Resterende schuld: {1}.",
          money(r.amount),
          money(r.remaining),
        ),
      );
    }
    return reply(tr("Ongeldige actie."));
  } catch (e) {
    if (!e.loanInput) logger.warn(`Bank: ${e.stack || e}`);
    return reply(
      e.loanInput
        ? e.message
        : tr("De bankactie is niet voltooid. Controleer je leningstatus."),
    );
  }
}
function tick(client) {
  for (const r of data.due()) {
    if (!client.guilds.cache.has(r.guild_id)) continue;
    try {
      data.collect(r.guild_id, r.user_id);
    } catch (e) {
      logger.warn(`Lening incasseren: ${e.message}`);
    }
  }
}
function start(client) {
  if (timer) return;
  tick(client);
  timer = setInterval(() => tick(client), 15000);
  timer.unref();
}
module.exports = { execute, start, tick };
