const { tr, send, getLanguage, pair } = require('../../utils/localization');
const { SlashCommandBuilder } = require('discord.js');
const docs = require('../../services/documentation');
const support = tr('Voor support ga naar https://discord.gg/nTzVy5uMWX');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Ontvang een handleiding of kies uit alle documenten in docs.')
        .setDescriptionLocalizations({ 'en-US': 'Get a manual or choose from all documents in docs.', 'en-GB': 'Get a manual or choose from all documents in docs.' })
        .addStringOption(o => o.setName('taal')
            .setNameLocalizations({ 'en-US': 'language', 'en-GB': 'language' })
            .setDescription('Taal van de standaardhandleiding; andere documenten worden niet vertaald.')
            .setDescriptionLocalizations({ 'en-US': 'Default manual language; other documents are not translated.', 'en-GB': 'Default manual language; other documents are not translated.' })
            .addChoices({ name: 'Nederlands', value: 'nl' }, { name: 'English', value: 'en' }))
        .addStringOption(o => o.setName('document')
            .setDescription('Zoek een document of kies overzicht voor de volledige lijst.')
            .setDescriptionLocalizations({ 'en-US': 'Find a document or choose overview for the complete list.', 'en-GB': 'Find a document or choose overview for the complete list.' })
            .setAutocomplete(true)),
    category: 'Algemeen', cooldown: 10,
    async autocomplete(_client, interaction) {
        const query = String(interaction.options.getFocused() || '').toLowerCase();
        const entries = await docs.catalog();
        const overview = { name: pair('Overzicht — alle documentatie', 'Overview — all documentation'), value: 'overzicht' };
        const options = entries.filter(d => d.name.toLowerCase().includes(query)).map(d => ({ name: d.name.slice(0, 100), value: d.value }));
        if (!query || 'overzicht overview'.includes(query)) options.unshift(overview);
        return send(interaction, 'respond', options.slice(0, 25));
    },
    async execute(_client, interaction) {
        await interaction.deferReply();
        const choice = interaction.options.getString('document');
        const language = interaction.options.getString('taal') || getLanguage(interaction.guildId, interaction.user.id);
        const name = choice || (language === 'en' ? 'MANUAL-EN.md' : 'HANDLEIDING.md');
        if (['overzicht', 'overview'].includes(name.toLowerCase())) {
            const entries = await docs.catalog();
            const listing = entries.map(d => `${d.name}\n/help document:${d.value}`).join('\n\n');
            return send(interaction, 'editReply', {
                content: pair('📚 **Alle documentatie**\nKies een bestand met `/help document:`. De bijlage bevat de volledige lijst.', '📚 **All documentation**\nChoose a file with `/help document:`. The attachment contains the complete list.') + '\n\n' + support,
                files: [{ attachment: Buffer.from(listing || 'Geen documenten / No documents', 'utf8'), name: 'documentatie-overzicht.txt' }],
                allowedMentions: { parse: [] }
            });
        }
        try {
            const file = await docs.readDocument(name);
            return send(interaction, 'editReply', {
                content: pair('📖 **Documentatie**\nDownload de bijlage. Andere onderwerpen vind je met `/help document:overzicht`.', '📖 **Documentation**\nDownload the attachment. Find other topics with `/help document:overzicht`.') + '\n\n' + support,
                files: [file], allowedMentions: { parse: [] }
            });
        } catch (error) {
            if (!['DOCUMENT_NOT_FOUND', 'DOCUMENT_TOO_LARGE'].includes(error.message) && error.code !== 'ENOENT') throw error;
            return send(interaction, 'editReply', {
                content: (error.message === 'DOCUMENT_TOO_LARGE'
                    ? pair('Dit document is te groot om via /help te versturen (maximaal 8 MB).', 'This document is too large to send through /help (maximum 8 MB).')
                    : pair('Document niet gevonden. Kies een bestand via `/help document:` en controleer of de map docs volledig is bijgewerkt.', 'Document not found. Choose a file using `/help document:` and check that the docs folder is up to date.')) + '\n\n' + support,
                allowedMentions: { parse: [] }
            });
        }
    }
};
