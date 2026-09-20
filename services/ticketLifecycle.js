const { MessageFlags } = require('discord.js');
const tickets = require('../database/tickets');
const { deliverTranscript } = require('./ticketTranscript');
const working = new Set();
async function finishTicket(client, interaction, remove = false) {
    const channel = interaction.channel;
    const ticket = tickets.getTicket(channel.id);
    if (!ticket || ticket.guild_id !== interaction.guild.id) return interaction.reply({ content: '❌ Dit kanaal is geen ticket.', flags: MessageFlags.Ephemeral });
    if (working.has(channel.id)) return interaction.reply({ content: '⏳ Dit ticket wordt al verwerkt.', flags: MessageFlags.Ephemeral });
    if (!remove && ticket.status === 'closed' && ticket.transcript_dm_sent_at) return interaction.reply({ content: 'ℹ️ Dit ticket is al gesloten.', flags: MessageFlags.Ephemeral });
    working.add(channel.id);
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        // A failed export/local save aborts deletion so the conversation is recoverable.
        const result = await deliverTranscript(client, channel, ticket);
        const status = result.dmSent ? '✅ Transcript via DM afgeleverd (eventueel bij eerder sluiten).' : '⚠️ Transcript-DM mislukt. Geef de eigenaar de kopie uit het logkanaal of de map transcripts.';
        if (remove) {
            await interaction.editReply({ content: `🗑️ Ticket wordt verwijderd. ${status}`, allowedMentions: { parse: [] } });
            await channel.delete(`Ticket verwijderd door ${interaction.user.tag}`);
            tickets.deleteTicket(channel.id);
        } else {
            await channel.permissionOverwrites.edit(ticket.user_id, { ViewChannel: false, SendMessages: false });
            tickets.closeTicket(channel.id);
            await interaction.editReply({ content: `🔒 Ticket gesloten. ${status}`, allowedMentions: { parse: [] } });
        }
    } finally { working.delete(channel.id); }
}
module.exports = { finishTicket };
