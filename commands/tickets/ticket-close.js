const { SlashCommandBuilder } = require('discord.js');
const { finishTicket } = require('../../services/ticketLifecycle');
module.exports = {
    data: new SlashCommandBuilder().setName('ticket-close').setDescription('Sluit het huidige ticket en stuur de eigenaar een transcript.'),
    category: 'Tickets', permissions: ['ManageChannels'], guildOnly: true,
    execute: finishTicket
};
