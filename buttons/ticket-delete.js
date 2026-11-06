const { MessageFlags } = require('discord.js');
const { hasStaffRole } = require('../utils/permissions');
const { requestClose } = require('../services/ticketLifecycle');
module.exports = {
    customId: 'ticket-delete',
    async execute(client, interaction) {
        if (!hasStaffRole(interaction.member)) return interaction.reply({ content: '❌ Je hebt geen toestemming om tickets te verwijderen.', flags: MessageFlags.Ephemeral });
        return requestClose(client, interaction, true);
    }
};
