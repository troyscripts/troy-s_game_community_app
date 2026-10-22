const { SlashCommandBuilder } = require("discord.js");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("bank")
    .setDescription(
      "Leen tot €500.000 met 30% vaste rente of los je lening af.",
    )
    .addStringOption((o) =>
      o
        .setName("actie")
        .setDescription("Informatie, leningstatus, lenen of aflossen.")
        .addChoices(
          ...["informatie", "status", "lenen", "aflossen"].map((value) => ({
            name: value,
            value,
          })),
        ),
    )
    .addIntegerOption((o) =>
      o
        .setName("bedrag")
        .setDescription("Bedrag in hele euro’s; lenen maximaal €500.000.")
        .setMinValue(1)
        .setMaxValue(650000),
    )
    .addBooleanOption((o) =>
      o
        .setName("bevestigen")
        .setDescription("Accepteer de rente, termijn en automatische incasso."),
    ),
  category: "Economy",
  guildOnly: true,
  cooldown: 3,
  execute: require("../../services/loans").execute,
};
