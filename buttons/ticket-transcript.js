const { tr, send, sendLogMessage } = require("../utils/localization");
const { EmbedBuilder, MessageFlags } = require("../utils/discord");
const discordTranscripts = require('discord-html-transcripts');
const config = require('../config/config');
const ticketDB = require('../database/tickets');
const logger = require('../utils/logger');
const { hasStaffRole } = require('../utils/permissions');
const working = new Set();

module.exports = {
    customId: 'ticket-transcript',
    async execute(_client, interaction) {
        if (!interaction.guild || !hasStaffRole(interaction.member)) {
            return send(interaction, "reply", { content: tr("❌ Je hebt geen toestemming om transcripts te maken."), flags: MessageFlags.Ephemeral });
        }
        const ticket = ticketDB.getTicket(interaction.channel.id);
        if (!ticket || ticket.guild_id !== interaction.guild.id) {
            return send(interaction, "reply", { content: tr("❌ Dit kanaal is geen ticket."), flags: MessageFlags.Ephemeral });
        }
        const logChannel = interaction.guild.channels.cache.get(config.Tickets.LogChannel);
        if (!logChannel?.isTextBased?.()) {
            return send(interaction, "reply", { content: tr("❌ Het ticketlogkanaal ontbreekt. Stel Tickets.LogChannel in via /config."), flags: MessageFlags.Ephemeral });
        }
        const key = `${interaction.guild.id}:${interaction.channel.id}`;
        if (working.has(key)) {
            return send(interaction, "reply", { content: tr("⏳ Er wordt al een transcript van dit ticket gemaakt."), flags: MessageFlags.Ephemeral });
        }
        working.add(key);
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const transcript = await discordTranscripts.createTranscript(interaction.channel, {
                limit: -1,
                filename: `ticket-${interaction.channel.id}.html`
            });
            const embed = new EmbedBuilder().setColor(config.Bot.Color)
                .setTitle(tr("📄 Tickettranscript"))
                .setDescription(tr("**Ticket:** <#{0}>\n**Gemaakt door:** <@{1}>\n**Eigenaar:** <@{2}>", interaction.channel.id, interaction.user.id, ticket.user_id))
                .setFooter({ text: config.Bot.Footer }).setTimestamp();
            await sendLogMessage(logChannel, "send", { embeds: [embed], files: [transcript], allowedMentions: { parse: [] } });
            return await send(interaction, "editReply", { content: tr("✅ Transcript opgeslagen in <#{0}>.", logChannel.id), allowedMentions: { parse: [] } });
        } catch (error) {
            logger.error(`Tickettranscript maken of versturen mislukt: ${error.stack || error}`);
            const payload = { content: tr("❌ Het transcript kon niet worden gemaakt of verstuurd. Bekijk de botconsole voor de oorzaak.") };
            if (interaction.deferred || interaction.replied) return send(interaction, "editReply", payload).catch(() => {});
            return send(interaction, "reply", { ...payload, flags: MessageFlags.Ephemeral }).catch(() => {});
        } finally { working.delete(key); }
    }
};
