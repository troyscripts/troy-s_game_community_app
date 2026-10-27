const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { isBotOwner } = require('../../utils/botIdentity');
const { broadcast } = require('../../services/botBroadcast');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botbericht')
        .setDescription('Alleen Troy: stuur een bericht naar het botlogkanaal van alle servers.')
        .addStringOption(option => option.setName('bericht')
            .setDescription('Het bericht voor alle ingestelde botlogkanalen.')
            .setRequired(true).setMinLength(1).setMaxLength(2000))
        .setDefaultMemberPermissions(null),
    category: 'Owner',
    botOwnerOnly: true,
    guildOnly: true,
    cooldown: 10,
    async execute(client, interaction) {
        if (!isBotOwner(interaction.user.id)) {
            return interaction.reply({ content: '❌ Alleen de vaste boteigenaar kan dit command gebruiken.', flags: MessageFlags.Ephemeral });
        }
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        try {
            const result = await broadcast(client, interaction.user.id, interaction.options.getString('bericht', true), interaction.id);
            await interaction.editReply({
                content: result.queued
                    ? `Botbericht ${result.id} staat in de centrale wachtrij voor ${result.total} unieke Discord-servers. De aangesloten bots halen het bericht op; offline bots doen dit later. Dit is nog geen afleverbevestiging. Resultaten staan in de botconsoles.`
                    : `Botbericht afgerond: ${result.sent} verstuurd, ${result.skipped} overgeslagen (geen botlogkanaal), ${result.failed} mislukt. Details van mislukte verzendingen staan in de console.`,
                allowedMentions: { parse: [] }
            });
        } catch (error) {
            await interaction.editReply({ content: error.message, allowedMentions: { parse: [] } });
        }
    }
};
