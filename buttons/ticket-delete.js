const { MessageFlags } = require('discord.js');
const { hasStaffRole } = require('../utils/permissions');
const { finishTicket } = require('../services/ticketLifecycle');
module.exports = {
    customId: 'ticket-delete',
    async execute(client, interaction) {
        if (!hasStaffRole(interaction.member)) return interaction.reply({ content: '❌ Je hebt geen toestemming om tickets te verwijderen.', flags: MessageFlags.Ephemeral });
        return finishTicket(client, interaction, true);
    }
};
