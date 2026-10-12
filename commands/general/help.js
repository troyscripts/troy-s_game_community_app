const { tr, send, getLanguage, pair } = require("../../utils/localization");
const { SlashCommandBuilder } = require("discord.js");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

const manuals = {
    nl: {
        filename: "HANDLEIDING.md",
        support: tr("Voor support ga naar https://discord.gg/nTzVy5uMWX"),
        message: tr("📖 **Bot-handleiding**\nDownload de bijlage voor uitleg over de commando’s en instellingen."),
        missing: tr("De Nederlandse handleiding ontbreekt. Vraag de botbeheerder om HANDLEIDING.md in de hoofdmap van de bot te plaatsen.")
    },
    en: {
        filename: "MANUAL-EN.md",
        support: "For support, go to https://discord.gg/nTzVy5uMWX",
        message: "📖 **Bot manual**\nDownload the attachment for instructions on commands and settings.",
        missing: "The English manual is missing. Ask the bot administrator to place MANUAL-EN.md in the bot’s main folder."
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Ontvang de bot-handleiding en supportlink in dit kanaal.")
        .setDescriptionLocalizations({
            "en-US": "Receive the bot manual and support link in this channel.",
            "en-GB": "Receive the bot manual and support link in this channel."
        })
        .addStringOption(option => option
            .setName("taal")
            .setNameLocalizations({ "en-US": "language", "en-GB": "language" })
            .setDescription("Taal van de handleiding. Standaard: je /language-voorkeur.")
            .setDescriptionLocalizations({
                "en-US": "Manual language. Default: your /language preference.",
                "en-GB": "Manual language. Default: your /language preference."
            })
            .setRequired(false)
            .addChoices({ name: "Nederlands", value: "nl" }, { name: "English", value: "en" })),

    category: "Algemeen",
    cooldown: 10,

    async execute(client, interaction) {
        await interaction.deferReply();
        const language = interaction.options.getString("taal") || getLanguage(interaction.guildId, interaction.user.id);
        const selected = manuals[language] || manuals.nl;
        let manual;
        try {
            manual = await readFile(path.join(__dirname, "..", "..", selected.filename));
        } catch (error) {
            if (error.code !== "ENOENT") throw error;
            return send(interaction, "editReply", {
                content: `${selected.missing}\n\n${selected.support}`,
                allowedMentions: { parse: [] }
            });
        }
        return send(interaction, "editReply", {
            content: `${manuals.nl.message}\n\n${manuals.nl.support}`,
            files: [{ attachment: manual, name: selected.filename }],
            allowedMentions: { parse: [] }
        });
    }
};
