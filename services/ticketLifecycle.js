const { tr, send } = require("../utils/localization");
const { MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config/config');
const tickets = require('../database/tickets');
const { deliverTranscript } = require('./ticketTranscript');
const logger=require('../utils/logger');
async function finishTicket(client, interaction, remove = false) {
    const channel = interaction.channel;
    const ticket = tickets.getTicket(channel.id);
    if (!ticket || ticket.guild_id !== interaction.guild.id) return send(interaction, "editReply", { content: tr("❌ Dit kanaal is geen ticket."), flags: MessageFlags.Ephemeral });
    let phase = 'stafftoegang controleren';
    try {
        // A failed export/local save aborts deletion so the conversation is recoverable.
        await require('./ticketAccess').authorizeAction(interaction, ticket);
        if (!config.Tickets.LogChannel || [channel.id, ticket.staff_thread_id].includes(config.Tickets.LogChannel)) {
            const error = new Error(tr('Stel Tickets.LogChannel in op een apart ticketlogkanaal. Het ticket blijft behouden.'));
            error.ticketInput = true;
            throw error;
        }
        phase = 'transcripten bewaren';
        const result = await deliverTranscript(client, channel, ticket);
        if (!result.logged) {
            const error = new Error(tr('Het transcript kon niet naar Tickets.LogChannel worden verstuurd. Het ticket blijft behouden; controleer het logkanaal en de botrechten.'));
            error.ticketInput = true;
            throw error;
        }
        let status = result.dmSent ? tr("✅ Transcript via DM afgeleverd (eventueel bij eerder sluiten).") : tr("⚠️ Transcript-DM mislukt. Geef de eigenaar de kopie uit het logkanaal of de map transcripts.");
        if (result.staffThreadMissing) status += ' ' + tr('⚠️ De oude staffthread ontbreekt; dit is vastgelegd in het stafflog.');
        phase = 'ticketkanaal verwijderen';
        await send(interaction, "editReply", { content: tr("🗑️ Ticket wordt verwijderd. {0}", status), allowedMentions: { parse: [] } });
        try {
            await channel.delete(`Ticket gesloten en verwijderd door ${interaction.user.tag}`);
        } catch (error) {
            if (Number(error.code) !== 10003) throw error;
        }
        tickets.deleteTicket(channel.id);
    } catch(error) {
        if(!error.ticketInput)logger.warn(`Ticket sluiten/verwijderen ${channel.id} [${phase}; Discord ${error.code || 'onbekend'}]: ${error.message}`);
        return send(interaction,'editReply',{
            content:error.ticketInput?error.message:tr('Het ticket kon niet worden gesloten of verwijderd. Controleer het ticketlog, threadlog, bestandsopslag en botrechten en probeer opnieuw.'),
            allowedMentions:{parse:[]}
        });
    }
}
async function requestClose(client, interaction) {
    await interaction.deferReply({flags:MessageFlags.Ephemeral});
    const ticket = tickets.getTicket(interaction.channel.id);
    if (!ticket || ticket.guild_id !== interaction.guild.id) return send(interaction,'editReply',{content:tr('❌ Dit kanaal is geen ticket.')});
    try {
        await require('./ticketAccess').authorizeAction(interaction,ticket);
        return send(interaction,'editReply',{
            content:tr('Ticket sluiten en verwijderen? Het gesprek wordt eerst in het ticketlog opgeslagen. Aanwezig staffoverleg gaat afzonderlijk naar het staffthread-logkanaal.'),
            components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket-confirm-close').setLabel(tr('Sluiten en verwijderen bevestigen')).setStyle(ButtonStyle.Danger))],
            allowedMentions:{parse:[]}
        });
    } catch(error) { return send(interaction,'editReply',{content:error.message,allowedMentions:{parse:[]}}); }
}
module.exports = { requestClose, finishTicket: async (client,i,remove=false)=>{
    await i.deferReply({flags:MessageFlags.Ephemeral});
    return require('./ticketAccess').withTicket(i.channel.id,()=>finishTicket(client,i,remove));
} };
