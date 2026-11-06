const { SlashCommandBuilder } = require('discord.js');
const service = require('../../services/governmentTickets');
module.exports = {
    data: service.configure(new SlashCommandBuilder().setName('politie').setDescription('Plaats of configureer het politieticketpaneel.'), 'politie'),
    guildOnly: true, notifyOnly: true, category: 'Overheid',
    execute: (client, interaction) => service.command(client, interaction, 'politie')
};
