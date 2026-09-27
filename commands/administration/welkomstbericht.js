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
        .addSubcommand(sub => sub.setName('voorbeeld').setDescription('Bekijk invulvelden en een voorbeeld van de huidige tekst')),
    category: 'Beheer',
    guildOnly: true,
    dmAllowed: false,
    ownerOnly: true,
    cooldown: 1,
    async execute(_client, interaction) {
        if (!hasOwnerAccess(interaction.member, interaction.user.id)) {
            return interaction.reply({ content: '❌ Alleen de owner of een ingestelde developer kan de welkomsttekst beheren.', flags: MessageFlags.Ephemeral });
        }
        if (interaction.options.getSubcommand() === 'instellen') {
            try {
                settings.setWelcomeMessage(interaction.guild.id, interaction.options.getString('tekst', true));
            } catch (error) {
                return interaction.reply({ content: `❌ ${error.message}`, flags: MessageFlags.Ephemeral });
            }
        }
        const message = settings.getGuildConfig(interaction.guild.id).Welcome.Message;
        const preview = renderWelcome(message, { id: interaction.user.id, user: interaction.user, guild: interaction.guild });
        return interaction.reply({
            content: `${interaction.options.getSubcommand() === 'instellen' ? '✅ Welkomsttekst opgeslagen.\n\n' : ''}` +
                '**Beschikbare invulvelden**\n' +
                '`{gebruiker}` → vermelding van het nieuwe lid\n' +
                '`{gebruikersnaam}` → naam van het nieuwe lid\n' +
                '`{server}` → servernaam\n' +
                '`{ledenaantal}` → actueel aantal leden\n' +
                '`{gebruikersid}` → Discord-ID van het lid\n' +
                '`{serverid}` → Discord-ID van de server\n\n' +
                '**Voorbeeldtekst om in te vullen**\n' +
                '`Welkom {gebruiker} bij {server}! Je bent lid nummer {ledenaantal}.`\n\n' +
                '**Voorbeeld met de huidige tekst**\n' +
                preview.slice(0, 1100),
            allowedMentions: { parse: [] },
            flags: MessageFlags.Ephemeral
        });
    }
};
