const { tr, send } = require("../utils/localization");
const { MessageFlags } = require('discord.js');
const tickets = require('../database/tickets');
const { deliverTranscript } = require('./ticketTranscript');
const logger=require('../utils/logger');
async function finishTicket(client, interaction, remove = false) {
    const channel = interaction.channel;
    const ticket = tickets.getTicket(channel.id);
    if (!ticket || ticket.guild_id !== interaction.guild.id) return send(interaction, "editReply", { content: tr("❌ Dit kanaal is geen ticket."), flags: MessageFlags.Ephemeral });
    if (!remove && ticket.status === 'closed' && ticket.transcript_dm_sent_at) return send(interaction, "editReply", { content: tr("ℹ️ Dit ticket is al gesloten."), flags: MessageFlags.Ephemeral });
    let phase = 'stafftoegang controleren';
    try {
        // A failed export/local save aborts deletion so the conversation is recoverable.
        await require('./ticketAccess').authorizeAction(interaction, ticket);
        phase = 'transcripten bewaren';
        const result = await deliverTranscript(client, channel, ticket);
        let status = result.dmSent ? tr("✅ Transcript via DM afgeleverd (eventueel bij eerder sluiten).") : tr("⚠️ Transcript-DM mislukt. Geef de eigenaar de kopie uit het logkanaal of de map transcripts.");
        if (result.staffThreadMissing) status += ' ' + tr('⚠️ De oude staffthread ontbreekt; dit is vastgelegd in het stafflog.');
        if (remove) {
            phase = 'ticketkanaal verwijderen';
            await send(interaction, "editReply", { content: tr("🗑️ Ticket wordt verwijderd. {0}", status), allowedMentions: { parse: [] } });
            try {
                await channel.delete(`Ticket verwijderd door ${interaction.user.tag}`);
            } catch (error) {
                // Only tolerate an already deleted channel after transcripts were saved.
                if (Number(error.code) !== 10003) throw error;
            }
            tickets.deleteTicket(channel.id);
        } else {
            phase = 'ticketkanaal afsluiten';
            await channel.permissionOverwrites.edit(ticket.user_id, { ViewChannel: false, SendMessages: false });
            tickets.closeTicket(channel.id);
            await send(interaction, "editReply", { content: tr("🔒 Ticket gesloten. {0}", status), allowedMentions: { parse: [] } });
        }
    } catch(error) {
        if(!error.ticketInput)logger.warn(`Ticket sluiten/verwijderen ${channel.id} [${phase}; Discord ${error.code || 'onbekend'}]: ${error.message}`);
        return send(interaction,'editReply',{
            content:error.ticketInput?error.message:tr('Het ticket kon niet worden gesloten of verwijderd. Controleer het threadlog, bestandsopslag en botrechten en probeer opnieuw.'),
            allowedMentions:{parse:[]}
        });
    }
}
module.exports = { finishTicket: async (client,i,remove=false)=>{
    await i.deferReply({flags:MessageFlags.Ephemeral});
    return require('./ticketAccess').withTicket(i.channel.id,()=>finishTicket(client,i,remove));
} };
