const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const config = require('../config/config');
const panels = require('../database/ticketPanels');
module.exports = {
    customId: 'ticket_category',
    async execute(_client, interaction) {
        try {
            if (!config.Tickets.Enabled) throw new Error('Het ticketsysteem is momenteel uitgeschakeld.');
            const panelId = interaction.customId.split(':')[1];
            const value = interaction.values[0];
            const label = panels.resolve(interaction.guild.id, panelId, value);
            const reason = new TextInputBuilder().setCustomId('ticket_reason').setLabel('Waarmee kunnen we je helpen?')
                .setStyle(TextInputStyle.Paragraph).setMinLength(10).setMaxLength(1000).setRequired(true);
            const modal = new ModalBuilder().setCustomId(panelId ? `ticket_create:${panelId}:${value}` : `ticket_create:${value}`)
                .setTitle(`Nieuw ticket - ${label}`.slice(0, 45)).addComponents(new ActionRowBuilder().addComponents(reason));
            return await interaction.showModal(modal);
        } catch(error) {
            return interaction.reply({ content: `❌ ${error.message}`, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
        }
    }
};
