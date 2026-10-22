const { ActionRowBuilder, MessageFlags, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config/config');
const tickets = require('../database/tickets');
const panels = require('../database/ticketPanels');
module.exports = {
    customId: 'ticket_open',
    async execute(_client, interaction) {
        if (!config.Tickets.Enabled) return interaction.reply({ content: '❌ Het ticketsysteem is momenteel uitgeschakeld.', flags: MessageFlags.Ephemeral });
        const count = tickets.getOpenTicketCount(interaction.user.id, interaction.guild.id);
        if (count >= config.Tickets.MaxOpenPerUser) {
            const current = tickets.getOpenTicket(interaction.user.id, interaction.guild.id);
            return interaction.reply({ content: current ? `❌ Je hebt al een open ticket: <#${current.channel_id}>` : '❌ Je hebt het maximale aantal open tickets bereikt.', flags: MessageFlags.Ephemeral });
        }
        try {
            const panelId = interaction.customId.split(':')[1];
            const options = panels.getOptions(interaction.guild.id, panelId);
            const menu = new StringSelectMenuBuilder().setCustomId(panelId ? `ticket_category:${panelId}` : 'ticket_category')
                .setPlaceholder('Kies een categorie').setMinValues(1).setMaxValues(1).addOptions(options);
            return await interaction.reply({ content: 'Kies waarvoor je een ticket wilt openen:',
                components: [new ActionRowBuilder().addComponents(menu)], flags: MessageFlags.Ephemeral });
        } catch(error) {
            return interaction.reply({ content: `❌ ${error.message}`, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
        }
    }
};
