const { SlashCommandBuilder } = require('discord.js');
const service = require('../../services/governmentTickets');
module.exports = {
    data: service.configure(new SlashCommandBuilder().setName('brandweer').setDescription('Plaats of configureer het brandweerticketpaneel.'), 'brandweer'),
    guildOnly: true, notifyOnly: true, category: 'Overheid',
    execute: (client, interaction) => service.command(client, interaction, 'brandweer')
};
