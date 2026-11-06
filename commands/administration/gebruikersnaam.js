const { SlashCommandBuilder } = require('discord.js');
const installation = require('../../services/installation');
module.exports = {
    data: new SlashCommandBuilder().setName('gebruikersnaam')
        .setDescription('Wijzig de botnaam op deze server en start of hervat de installatie')
        .addStringOption(o => o.setName('naam').setDescription('Nieuwe zichtbare botnaam op deze server; leeg laten om te hervatten').setMinLength(1).setMaxLength(32))
        .addStringOption(o => o.setName('instelling').setDescription('Spring rechtstreeks naar een instelling of extra installatiestap').setAutocomplete(true)),
    guildOnly: true, dmAllowed: false, category: 'Beheer', cooldown: 2,
    async autocomplete(client, interaction) {
        if (!installation.allowed(interaction)) return interaction.respond([]);
        const query = interaction.options.getFocused().toLowerCase();
        return interaction.respond(installation.paths().filter(p => p.toLowerCase().includes(query)).slice(0, 25).map(p => ({ name: p, value: p })));
    },
    execute: installation.open
};
