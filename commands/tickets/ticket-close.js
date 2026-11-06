const { SlashCommandBuilder } = require('discord.js');
const { requestClose } = require('../../services/ticketLifecycle');
module.exports = {
    data: new SlashCommandBuilder().setName('ticket-close').setDescription('Sla transcripten op en verwijder het huidige ticket na bevestiging.'),
    category: 'Tickets', permissions: ['ManageChannels'], guildOnly: true,
    execute: requestClose
};
