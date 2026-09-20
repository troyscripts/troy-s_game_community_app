const { EmbedBuilder, MessageFlags } = require('discord.js');
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
            return interaction.reply({ content: '❌ Je hebt geen toestemming om transcripts te maken.', flags: MessageFlags.Ephemeral });
        }
        const ticket = ticketDB.getTicket(interaction.channel.id);
        if (!ticket || ticket.guild_id !== interaction.guild.id) {
            return interaction.reply({ content: '❌ Dit kanaal is geen ticket.', flags: MessageFlags.Ephemeral });
        }
        const logChannel = interaction.guild.channels.cache.get(config.Tickets.LogChannel);
        if (!logChannel?.isTextBased?.()) {
            return interaction.reply({ content: '❌ Het ticketlogkanaal ontbreekt. Stel Tickets.LogChannel in via /config.', flags: MessageFlags.Ephemeral });
        }
        const key = `${interaction.guild.id}:${interaction.channel.id}`;
        if (working.has(key)) {
            return interaction.reply({ content: '⏳ Er wordt al een transcript van dit ticket gemaakt.', flags: MessageFlags.Ephemeral });
        }
        working.add(key);
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const transcript = await discordTranscripts.createTranscript(interaction.channel, {
                limit: -1,
                filename: `ticket-${interaction.channel.id}.html`
            });
            const embed = new EmbedBuilder().setColor(config.Bot.Color)
                .setTitle('📄 Tickettranscript')
                .setDescription(`**Ticket:** <#${interaction.channel.id}>\n**Gemaakt door:** <@${interaction.user.id}>\n**Eigenaar:** <@${ticket.user_id}>`)
                .setFooter({ text: config.Bot.Footer }).setTimestamp();
            await logChannel.send({ embeds: [embed], files: [transcript], allowedMentions: { parse: [] } });
            return await interaction.editReply({ content: `✅ Transcript opgeslagen in <#${logChannel.id}>.`, allowedMentions: { parse: [] } });
        } catch (error) {
            logger.error(`Tickettranscript maken of versturen mislukt: ${error.stack || error}`);
            const payload = { content: '❌ Het transcript kon niet worden gemaakt of verstuurd. Bekijk de botconsole voor de oorzaak.' };
            if (interaction.deferred || interaction.replied) return interaction.editReply(payload).catch(() => {});
            return interaction.reply({ ...payload, flags: MessageFlags.Ephemeral }).catch(() => {});
        } finally { working.delete(key); }
    }
};
