const { SlashCommandBuilder } = require("discord.js");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("bedrijf")
    .setDescription("Bedrijvenmakelaar, inkomen, upgrades en verzekeringen.")
    .addStringOption((o) =>
      o
        .setName("actie")
        .setDescription("Wat wil je doen?")
        .addChoices(
          ...[
            "aanbod",
            "status",
            "kopen",
            "upgrade",
            "beveiliging",
            "verzekeren",
            "opzeggen",
            "uitrusting",
          ].map((value) => ({ name: value, value })),
        ),
    )
    .addStringOption((o) =>
      o
        .setName("soort")
        .setDescription("Bedrijfstype")
        .addChoices(
          ...["klein", "restaurant", "kantoor"].map((value) => ({
            name: value,
            value,
          })),
        ),
    )
    .addStringOption((o) =>
      o
        .setName("betaalmiddel")
        .setDescription("Betalen via bank of portemonnee")
        .addChoices(
          { name: "Bank", value: "bank" },
          { name: "Portemonnee", value: "wallet" },
        ),
    )
    .addBooleanOption((o) =>
      o
        .setName("bevestigen")
        .setDescription("Accepteer de kosten en voorwaarden uit het aanbod."),
    ),
  category: "Economy",
  guildOnly: true,
  cooldown: 3,
  execute: require("../../services/business").broker,
};
