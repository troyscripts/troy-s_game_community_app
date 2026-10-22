const { tr, send, clip, pair } = require("../../utils/localization");
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const settings = require('../../database/guildSettings');
const { hasOwnerAccess } = require('../../utils/permissions');
const { renderWelcome } = require('../../utils/welcomeMessage');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welkomstbericht')
        .setDescription('Beheer de welkomsttekst van deze server')
        .addSubcommand(sub => sub.setName('instellen').setDescription('Sla een nieuwe welkomsttekst op')
            .addStringOption(option => option.setName('tekst').setDescription('Tekst met bijvoorbeeld {gebruiker} en {ledenaantal}').setRequired(true).setMaxLength(4000)))
        .addSubcommand(sub => sub.setName('vertalen').setDescription('Vertaal de opgeslagen welkomsttekst naar het Engels.')
            .addStringOption(o=>o.setName('engels').setDescription('Optioneel: vul zelf een Engelse vertaling in of corrigeer deze.').setMaxLength(4000)))
        .addSubcommand(sub => sub.setName('voorbeeld').setDescription('Bekijk invulvelden en een voorbeeld van de huidige tekst')),
    category: 'Beheer',
    guildOnly: true,
    dmAllowed: false,
    ownerOnly: true,
    cooldown: 1,
    async execute(_client, interaction) {
        if (!hasOwnerAccess(interaction.member, interaction.user.id)) {
            return send(interaction, "reply", { content: tr("❌ Alleen de owner of een ingestelde developer kan de welkomsttekst beheren."), flags: MessageFlags.Ephemeral });
        }
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        if (interaction.options.getSubcommand() === 'vertalen') {
            try {
                await require('../../services/welcomeTranslation').translate(interaction.guild.id, interaction.options.getString('engels'));
            } catch (error) { return send(interaction, 'editReply', {content:error.message,allowedMentions:{parse:[]}}); }
        }
        if (interaction.options.getSubcommand() === 'instellen') {
            try {
                settings.setWelcomeMessage(interaction.guild.id, interaction.options.getString('tekst', true));
            } catch (error) {
                return send(interaction, "editReply", { content: `❌ ${error.message}`, flags: MessageFlags.Ephemeral });
            }
        }
        const message = settings.getGuildConfig(interaction.guild.id).Welcome.Message;
        const preview = renderWelcome(message, { id: interaction.user.id, user: interaction.user, guild: interaction.guild });
        return send(interaction, "editReply", {
            content: `${interaction.options.getSubcommand() === 'vertalen' ? pair('✅ Engelse welkomsttekst opgeslagen. Nieuwe leden krijgen beide talen.\n\n','✅ English welcome text saved. New members receive both languages.\n\n') : interaction.options.getSubcommand() === 'instellen' ? pair('✅ Welkomsttekst opgeslagen. Gebruik /welkomstbericht vertalen voor de Engelse versie.\n\n','✅ Welcome text saved. Use /welkomstbericht vertalen for the English version.\n\n') : ''}` +
                tr("**Beschikbare invulvelden**\n") +
                tr("`{gebruiker}` → vermelding van het nieuwe lid\n") +
                tr("`{gebruikersnaam}` → naam van het nieuwe lid\n") +
                tr("`{server}` → servernaam\n") +
                tr("`{ledenaantal}` → actueel aantal leden\n") +
                tr("`{gebruikersid}` → Discord-ID van het lid\n") +
                tr("`{serverid}` → Discord-ID van de server\n\n") +
                tr("**Voorbeeldtekst om in te vullen**\n") +
                tr("`Welkom {gebruiker} bij {server}! Je bent lid nummer {ledenaantal}.`\n\n") +
                tr("**Voorbeeld met de huidige tekst**\n") +
                clip(preview, 1100),
            allowedMentions: { parse: [] },
            flags: MessageFlags.Ephemeral
        });
    }
};
