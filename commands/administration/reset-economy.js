'use strict';
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { pair, send } = require('../../utils/localization');
const { hasOwnerAccess } = require('../../utils/permissions');
const { resetEconomy } = require('../../database/economyReset');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset-economy')
        .setDescription('Reset ieders geld en economy-cooldowns in deze server; behoud store-aankopen en XP.')
        .setDescriptionLocalizations({ 'en-US': 'Reset server balances and economy cooldowns; keep store purchases and XP.', 'en-GB': 'Reset server balances and economy cooldowns; keep store purchases and XP.' })
        .addBooleanOption(option => option.setName('bevestigen')
            .setDescription('Ja: reset positieve saldi en annuleer gewone rekeningen. Dit is definitief.')
            .setDescriptionLocalizations({ 'en-US': 'Yes: reset positive balances and cancel ordinary invoices. This is permanent.', 'en-GB': 'Yes: reset positive balances and cancel ordinary invoices. This is permanent.' })
            .setRequired(true)),
    category: 'Administration',
    guildOnly: true,
    ownerOnly: true,
    async execute(_client, interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        if (!interaction.guild || !hasOwnerAccess(interaction.member, interaction.user.id)) {
            return send(interaction, 'editReply', { content: pair('❌ Alleen de serverowner, botowner of ingestelde Owner-/Developer-rol kan dit gebruiken.', '❌ Only the server owner, bot owner or configured Owner/Developer role can use this.') });
        }
        if (interaction.options.getBoolean('bevestigen', true) !== true) {
            return send(interaction, 'editReply', { content: pair('ℹ️ Niets gewijzigd. Gebruik /reset-economy bevestigen:Ja om positieve saldi definitief op nul te zetten. Store-aankopen en XP blijven behouden.', 'ℹ️ Nothing changed. Use /reset-economy confirm:True to permanently reset positive balances. Store purchases and XP are preserved.') });
        }
        const result = resetEconomy(interaction.guild.id);
        if (result.pending) {
            return send(interaction, 'editReply', { content: pair('⏳ Niets gewijzigd: er worden nog store-aankopen verwerkt. Probeer opnieuw zodra die zijn afgehandeld.', '⏳ Nothing changed: store purchases are still being processed. Try again after they finish.') });
        }
        logger.info(`Economy gereset in server ${interaction.guild.id} door ${interaction.user.id}: ${result.economy} profielen, ${result.invoices} rekeningen geannuleerd; store en XP behouden.`);
        return send(interaction, 'editReply', {
            content: pair(`✅ Economy van deze server gereset.\n• ${result.economy} profielen: €0 portemonnee; positieve banksaldi op €0. Bestaande bankschuld blijft staan.\n• Daily-, work-, steel- en rekeningcooldowns gereset.\n• ${result.invoices} gewone rekeningen geannuleerd.\n\nStore-aankopen, verplichte rekeningen met rente en betaaldatum, VIP, rollen en XP/levels blijven behouden.`,
                `✅ Economy reset for this server.\n• ${result.economy} profiles: €0 wallet; positive bank balances zeroed. Existing bank debt remains.\n• Daily, work, steal and invoice cooldowns reset.\n• ${result.invoices} ordinary invoices cancelled.\n\nStore purchases, compulsory invoices with interest and due dates, VIP, roles and XP/levels are preserved.`),
            allowedMentions: { parse: [] }
        });
    }
};
