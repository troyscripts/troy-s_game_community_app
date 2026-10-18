const { SlashCommandBuilder } = require("discord.js");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("heist")
    .setDescription("Open een gezamenlijke bedrijfsoverval met aanmeldknoppen.")
    .addUserOption((o) =>
      o
        .setName("eigenaar")
        .setDescription("De eigenaar van het doelbedrijf")
        .setRequired(true),
    )
    .addStringOption((o) =>
      o
        .setName("soort")
        .setDescription("Het te overvallen bedrijf")
        .setRequired(true)
        .addChoices(
          ...["klein", "restaurant", "kantoor"].map((value) => ({
            name: value,
            value,
          })),
        ),
    ),
  category: "Economy",
  guildOnly: true,
  cooldown: 5,
  execute: require("../../services/business").startHeist,
};
