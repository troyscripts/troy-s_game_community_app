const { Events, EmbedBuilder, escapeMarkdown } = require("discord.js");

const config = require("../config/config");
const logger = require("../utils/logger");

function truncate(text, maximum) {
    return text.length > maximum ? `${text.slice(0, maximum - 1)}…` : text;
}

module.exports = {
    name: Events.MessageDelete,

    async execute(client, message) {
        if (!message.guild || message.author?.bot || !config.Logging?.MessageDelete) return;

        logger.event(`Bericht verwijderd van ${message.author?.tag || "Onbekend"}`);
        const channel = message.guild.channels.cache.get(config.Logging.Channel);
        if (!channel?.isTextBased?.()) return;

        const authorId = message.author?.id;
        const channelId = message.channelId || message.channel?.id;
        const attachments = [...(message.attachments?.values?.() || [])];
        const content = message.content
            ? truncate(message.content, 3000)
            : message.partial
                ? "*Inhoud niet beschikbaar: het bericht stond niet in de cache.*"
                : attachments.length
                    ? "*Bericht zonder tekst, met bijlage(n).*"
                    : "*Geen tekst beschikbaar; mogelijk bevatte dit bericht alleen een sticker of embed.*";

        const embed = new EmbedBuilder()
            .setColor(0xFF5722)
            .setTitle("Bericht verwijderd")
            .setDescription(
                `**Van:** ${authorId ? `<@${authorId}>` : "Onbekend"}    ` +
                `**In:** ${channelId ? `<#${channelId}>` : "Onbekend kanaal"}\n\n` +
                content
            )
            .setFooter({ text: `Auteur-ID: ${authorId || "onbekend"} | Bericht-ID: ${message.id}` })
            .setTimestamp();

        if (attachments.length) {
            const names = attachments.slice(0, 5).map((file) =>
                `• ${escapeMarkdown(truncate(String(file.name || "Bijlage"), 100))}`
            );
            if (attachments.length > 5) names.push(`En nog ${attachments.length - 5} bijlage(n).`);
            embed.addFields({ name: "Bijlagen", value: names.join("\n") });
        }

        await channel.send({
            embeds: [embed],
            allowedMentions: { parse: [], repliedUser: false }
        });
    }
};
