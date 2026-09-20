const { MessageFlags } = require('discord.js');
const { hasStaffRole } = require('../utils/permissions');
const { finishTicket } = require('../services/ticketLifecycle');
module.exports = {
    customId: 'ticket-close',
    async execute(client, interaction) {
        if (!hasStaffRole(interaction.member)) return interaction.reply({ content: '❌ Je hebt geen toestemming om tickets te sluiten.', flags: MessageFlags.Ephemeral });
        return finishTicket(client, interaction);
    }
};
