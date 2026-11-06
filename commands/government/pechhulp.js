const { SlashCommandBuilder } = require('discord.js');
const service = require('../../services/governmentTickets');
module.exports = {
    data: service.configure(new SlashCommandBuilder().setName('pechhulp').setDescription('Plaats of configureer het pechhulpticketpaneel.'), 'pechhulp'),
    guildOnly: true, notifyOnly: true, category: 'Overheid',
    execute: (client, interaction) => service.command(client, interaction, 'pechhulp')
};
