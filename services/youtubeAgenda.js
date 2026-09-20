const { EmbedBuilder } = require("discord.js");

const agenda = require("../database/agenda");
const config = require("../config/config");
const logger = require("../utils/logger");

const ITEMS_PER_EMBED = 8;

function agendaField(item) {
    const description = item.description
        ? `\n${item.description}`
        : "";

    return {
        name: `#${item.id} • <t:${item.scheduled_at}:F>`,
        value: `**${item.title}**${description}`,
        inline: false
    };
}

function buildAgendaEmbeds(guildId) {
    const allItems = agenda.getItems(guildId);
    const configuredMaximum = Number(config.Agenda?.MaxVisibleItems) || 80;
    const maximum = Math.min(80, Math.max(1, configuredMaximum));
    const items = allItems.slice(0, maximum);
    const title = config.Agenda?.Title || "📅 YouTube-planning";
    const youtubeUrl = config.Agenda?.YouTubeUrl;

    if (!items.length) {
        const emptyEmbed = new EmbedBuilder()
                .setColor(config.Bot.Color)
                .setTitle(title)
                .setDescription(
                    "Er staan momenteel nog geen video's of streams op de planning." +
                    (youtubeUrl ? `\n\n🔗 [Bekijk het YouTube-kanaal](${youtubeUrl})` : "")
                )
                .setFooter({ text: config.Bot.Footer })
                .setTimestamp();

        if (youtubeUrl) {
            emptyEmbed.setURL(youtubeUrl);
        }

        return [emptyEmbed];
    }

    const embeds = [];
    for (let index = 0; index < items.length; index += ITEMS_PER_EMBED) {
        const part = items.slice(index, index + ITEMS_PER_EMBED);
        const embed = new EmbedBuilder()
            .setColor(config.Bot.Color)
            .setTitle(index === 0 ? title : `${title} • vervolg`)
            .addFields(part.map(agendaField))
            .setFooter({
                text: index + ITEMS_PER_EMBED >= items.length
                    ? config.Bot.Footer
                    : `${config.Bot.Footer} • wordt vervolgd`
            })
            .setTimestamp();

        if (youtubeUrl) {
            embed.setURL(youtubeUrl);
        }

        if (index === 0) {
            embed.setDescription(
                `Dit staat er binnenkort gepland voor het YouTube-kanaal van ${config.Bot.Name}.` +
                (youtubeUrl ? `\n\n🔗 [Bekijk het YouTube-kanaal](${youtubeUrl})` : "")
            );
        }

        embeds.push(embed);
    }

    if (allItems.length > items.length) {
        embeds.at(-1).setFooter({
            text: `${config.Bot.Footer} • ${allItems.length - items.length} extra item(s) niet getoond`
        });
    }

    return embeds;
}

async function publishAgenda(channel) {
    const guildId = channel.guild.id;
    const embeds = buildAgendaEmbeds(guildId);
    const publication = agenda.getPublication(guildId, channel.id);

    if (publication) {
        const oldMessage = await channel.messages
            .fetch(publication.message_id)
            .catch(() => null);

        if (oldMessage) {
            await oldMessage.edit({ embeds, allowedMentions: { parse: [] } });
            return { message: oldMessage, updated: true };
        }

        agenda.removePublication(guildId, channel.id);
    }

    const message = await channel.send({
        embeds,
        allowedMentions: { parse: [] }
    });

    agenda.savePublication({
        guildId,
        channelId: channel.id,
        messageId: message.id
    });

    return { message, updated: false };
}

async function refreshPublishedAgendas(client, guildId) {
    const publications = agenda.getPublications(guildId);
    const embeds = buildAgendaEmbeds(guildId);
    let updated = 0;

    for (const publication of publications) {
        const channel = client.channels.cache.get(publication.channel_id) ||
            await client.channels.fetch(publication.channel_id).catch(() => null);

        if (!channel?.isTextBased?.()) {
            agenda.removePublication(guildId, publication.channel_id);
            continue;
        }

        const message = await channel.messages
            .fetch(publication.message_id)
            .catch(() => null);

        if (!message) {
            agenda.removePublication(guildId, publication.channel_id);
            continue;
        }

        try {
            await message.edit({ embeds, allowedMentions: { parse: [] } });
            updated++;
        } catch (error) {
            logger.warn(
                `YouTube-agenda kon niet worden bijgewerkt in kanaal ` +
                `${publication.channel_id}: ${error.message}`
            );
        }
    }

    return updated;
}

module.exports = {
    buildAgendaEmbeds,
    publishAgenda,
    refreshPublishedAgendas
};
