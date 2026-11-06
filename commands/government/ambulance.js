const { SlashCommandBuilder } = require('discord.js');
const service = require('../../services/governmentTickets');
module.exports = {
    data: service.configure(new SlashCommandBuilder().setName('ambulance').setDescription('Plaats of configureer het ambulanceticketpaneel.'), 'ambulance'),
    guildOnly: true, notifyOnly: true, category: 'Overheid',
    execute: (client, interaction) => service.command(client, interaction, 'ambulance')
};
