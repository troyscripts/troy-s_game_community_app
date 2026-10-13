const { tr, send, sendLogMessage } = require("../utils/localization");
const { Events, EmbedBuilder, escapeMarkdown } = require("../utils/discord");

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
                ? tr("*Inhoud niet beschikbaar: het bericht stond niet in de cache.*")
                : attachments.length
                    ? tr("*Bericht zonder tekst, met bijlage(n).*")
                    : tr("*Geen tekst beschikbaar; mogelijk bevatte dit bericht alleen een sticker of embed.*");

        const embed = new EmbedBuilder()
            .setColor(0xFF5722)
            .setTitle(tr("Bericht verwijderd"))
            .setDescription(
                tr("**Van:** {0}    ", authorId ? `<@${authorId}>` : tr("Onbekend")) +
                tr("**In:** {0}\n\n", channelId ? `<#${channelId}>` : tr("Onbekend kanaal")) +
                content
            )
            .setFooter({ text: tr("Auteur-ID: {0} | Bericht-ID: {1}", authorId || tr("onbekend"), message.id) })
            .setTimestamp();

        if (attachments.length) {
            const names = attachments.slice(0, 5).map((file) =>
                `• ${escapeMarkdown(truncate(String(file.name || tr("Bijlage")), 100))}`
            );
            if (attachments.length > 5) names.push(tr("En nog {0} bijlage(n).", attachments.length - 5));
            embed.addFields({ name: tr("Bijlagen"), value: names.join("\n") });
        }

        await sendLogMessage(channel, "send", {
            embeds: [embed],
            allowedMentions: { parse: [], repliedUser: false }
        });
    }
};
