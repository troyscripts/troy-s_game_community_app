const { MessageFlags } = require('discord.js');
const tickets = require('../database/tickets');
const { canDiscuss, getStaffThread } = require('../services/ticketDiscussion');
const working = new Set();
module.exports = {
    customId: 'ticket-discuss',
    async execute(_client, interaction) {
        const ticket = tickets.getTicket(interaction.channel.id);
        const member = await interaction.guild.members.fetch(interaction.user.id);
        if (!ticket || ticket.guild_id !== interaction.guild.id || !canDiscuss(ticket, member, interaction.channel)) {
            return interaction.reply({ content: '❌ Alleen de bevoegde staff van dit ticket kan het overleg openen.', flags: MessageFlags.Ephemeral });
        }
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        if (working.has(ticket.channel_id)) return interaction.editReply('⏳ Probeer het over enkele seconden opnieuw.');
        working.add(ticket.channel_id);
        try {
            const thread = await getStaffThread(interaction.channel, ticket);
            if (thread.archived) await thread.setArchived(false);
            await thread.members.add(member.id);
            return await interaction.editReply({ content: `💬 Staffoverleg: ${thread}`, allowedMentions: { parse: [] } });
        } finally { working.delete(ticket.channel_id); }
    }
};
