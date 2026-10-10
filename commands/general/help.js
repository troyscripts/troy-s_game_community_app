const { SlashCommandBuilder } = require("discord.js");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

const support = "Voor support ga naar https://discord.gg/nTzVy5uMWX";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Ontvang de bot-handleiding en supportlink in dit kanaal."),

    category: "Algemeen",
    cooldown: 10,

    async execute(client, interaction) {
        // Meteen openbaar bevestigen, voordat de handleiding wordt ingelezen.
        await interaction.deferReply();

        let manual;
        try {
            manual = await readFile(path.join(__dirname, "..", "..", "HANDLEIDING.md"));
        } catch (error) {
            if (error.code !== "ENOENT") throw error;
            return interaction.editReply({
                content: `De bot-handleiding ontbreekt. Vraag de botbeheerder om HANDLEIDING.md in de hoofdmap van de bot te plaatsen.\n\n${support}`,
                allowedMentions: { parse: [] }
            });
        }

        return interaction.editReply({
            content: `📖 **Bot-handleiding**\nDownload de bijlage voor uitleg over de commando’s en instellingen.\n\n${support}`,
            files: [{ attachment: manual, name: "HANDLEIDING.md" }],
            allowedMentions: { parse: [] }
        });
    }
};
