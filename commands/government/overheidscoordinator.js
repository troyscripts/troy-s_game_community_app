const { SlashCommandBuilder } = require('discord.js');
const service = require('../../services/governmentTickets');
module.exports = {
    data: service.configure(new SlashCommandBuilder().setName('overheidscoordinator').setDescription('Plaats of configureer het ticketpaneel voor de overheidscoördinator.'), 'overheidscoordinator'),
    guildOnly: true, notifyOnly: true, category: 'Overheid',
    execute: (client, interaction) => service.command(client, interaction, 'overheidscoordinator')
};
