const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { hasOwnerAccess } = require('../../utils/permissions');
const { resetProgress } = require('../../database/progressReset');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset-voortgang')
        .setDescription('Reset XP, levels en economy van iedereen in deze server. Dit is definitief.')
        .setDefaultMemberPermissions(null)
        .addBooleanOption(option => option
            .setName('bevestigen')
            .setDescription('Ja: reset alle XP/levels, geld en cooldowns; annuleer openstaande rekeningen.')
            .setRequired(true)),
    category: 'Administration',
    guildOnly: true,
    ownerOnly: true,

    async execute(_client, interaction) {
        if (!interaction.guild || !hasOwnerAccess(interaction.member, interaction.user.id)) {
            return interaction.reply({
                content: '❌ Alleen de owner of een ingestelde developer van deze server kan alle voortgang resetten.',
                flags: MessageFlags.Ephemeral
            });
        }
        if (interaction.options.getBoolean('bevestigen', true) !== true) {
            return interaction.reply({
                content: 'ℹ️ Niets gewijzigd. Kies bevestigen: Ja om XP, levels en economy van deze server definitief te resetten.',
                flags: MessageFlags.Ephemeral
            });
        }
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const result = resetProgress(interaction.guild.id);
        logger.info(`Voortgang gereset in server ${interaction.guild.id} door ${interaction.user.id}: ${result.levels} levelprofielen, ${result.economy} economyprofielen, ${result.invoices} rekeningen geannuleerd.`);
        return interaction.editReply({
            content: '✅ **Leaderboard en economy van deze server gereset.**\n\n' +
                `• ${result.levels} levelprofielen: level 1, 0 XP en 0 berichten.\n` +
                `• ${result.economy} economyprofielen: €0 wallet en €0 bank.\n` +
                '• XP-, daily-, work-, steel- en rekeningcooldowns gereset.\n' +
                `• ${result.invoices} openstaande rekeningen geannuleerd.\n\n` +
                'Bestaande Discord-rollen blijven staan. Nieuwe activiteit bouwt weer voortgang op.',
            allowedMentions: { parse: [] }
        });
    }
};
