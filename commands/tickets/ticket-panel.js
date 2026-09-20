const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ChannelType } = require('discord.js');
const config = require('../../config/config');
const panels = require('../../database/ticketPanels');
const { selectStaffRoles } = require('../../services/ticketStaff');

const data = new SlashCommandBuilder().setName('ticket-panel')
    .setDescription('Plaats een ticketpaneel met maximaal 10 eigen categorieën.');
for (let index = 1; index <= 10; index++) {
    data.addStringOption(option => option.setName(`categorie${index}`)
        .setDescription(`Naam van categorie ${index}, bijvoorbeeld Support of Bug melden`)
        .setMinLength(1).setMaxLength(50));
    data.addRoleOption(option => option.setName(`minimumrol${index}`)
        .setDescription(`Laagste staffrang voor categorie ${index}; leeg = alle staffrollen`));
}
module.exports = {
    data, category: 'Tickets', permissions: ['ManageChannels'], guildOnly: true,
    async execute(_client, interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        try {
            const slots = Array.from({length:10}, (_,i) => ({
                label: interaction.options.getString(`categorie${i+1}`),
                role: interaction.options.getRole(`minimumrol${i+1}`)
            }));
            if (slots.some(s => s.role && !s.label)) throw new Error('Vul bij elke minimumrol ook een categorie in.');
            const filled = slots.filter(s => s.label != null);
            const labels = filled.length ? panels.normalize(filled.map(s => s.label)) : panels.getOptions(interaction.guild.id).map(o => o.label);
            await interaction.guild.roles.fetch();
            for (const slot of filled) if (slot.role) selectStaffRoles(interaction.guild, config.StaffRoles, slot.role.id);
            if (!interaction.channel?.isTextBased?.()) throw new Error('Gebruik een tekstkanaal.');
            const setup = require('../../services/ticketPanelSetup');
            const draft = setup.createDraft(interaction, labels, filled.map(s => s.role?.id || null));
            return interaction.editReply(setup.render(draft));
        } catch (error) {
            return interaction.editReply({content:`❌ ${error.message}`,allowedMentions:{parse:[]}});
        }
    }
};
