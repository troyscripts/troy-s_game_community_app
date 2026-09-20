const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const {
    ChannelType,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder
} = require("discord.js");

const agenda = require("../../database/agenda");
const config = require("../../config/config");
const {
    buildAgendaEmbeds,
    publishAgenda,
    refreshPublishedAgendas
} = require("../../services/youtubeAgenda");

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

function parseScheduledAt(date, time) {
    const input = `${date} ${time}`;
    const format = "DD-MM-YYYY HH:mm";
    const zone = config.Agenda?.Timezone || "Europe/Amsterdam";
    const parsed = dayjs.tz(input, format, zone);

    if (!parsed.isValid() || parsed.format(format) !== input) {
        return null;
    }

    return parsed.unix();
}

function canPublishIn(channel, member) {
    const permissions = channel.permissionsFor(member);
    return permissions?.has(PermissionFlagsBits.ViewChannel) &&
        permissions.has(PermissionFlagsBits.SendMessages) &&
        permissions.has(PermissionFlagsBits.EmbedLinks);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("agenda")
        .setDescription("Beheer en toon de planning van het YouTube-kanaal.")
        .addSubcommand(subcommand =>
            subcommand
                .setName("toevoegen")
                .setDescription("Voeg iets toe aan de YouTube-planning.")
                .addStringOption(option =>
                    option
                        .setName("titel")
                        .setDescription("Titel van de video, stream of activiteit.")
                        .setRequired(true)
                        .setMinLength(1)
                        .setMaxLength(100)
                )
                .addStringOption(option =>
                    option
                        .setName("datum")
                        .setDescription("Geplande datum in het formaat DD-MM-JJJJ.")
                        .setRequired(true)
                        .setMinLength(10)
                        .setMaxLength(10)
                )
                .addStringOption(option =>
                    option
                        .setName("tijd")
                        .setDescription("Geplande tijd in het formaat UU:MM.")
                        .setRequired(true)
                        .setMinLength(5)
                        .setMaxLength(5)
                )
                .addStringOption(option =>
                    option
                        .setName("beschrijving")
                        .setDescription("Optionele extra uitleg voor de planning.")
                        .setRequired(false)
                        .setMinLength(1)
                        .setMaxLength(500)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("verwijderen")
                .setDescription("Verwijder een item uit de YouTube-planning.")
                .addIntegerOption(option =>
                    option
                        .setName("id")
                        .setDescription("Het nummer van het agendapunt.")
                        .setRequired(true)
                        .setMinValue(1)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("tonen")
                .setDescription("Plaats of vernieuw de YouTube-planning in een kanaal.")
                .addChannelOption(option =>
                    option
                        .setName("kanaal")
                        .setDescription("Doelkanaal; standaard wordt het huidige kanaal gebruikt.")
                        .addChannelTypes(
                            ChannelType.GuildText,
                            ChannelType.GuildAnnouncement
                        )
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("lijst")
                .setDescription("Bekijk de planning en de ID's voor beheer.")
        ),

    category: "YouTube",
    ownerOnly: true,
    guildOnly: true,
    cooldown: 1,

    async execute(client, interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand === "toevoegen") {
            const title = interaction.options.getString("titel", true).trim();
            const date = interaction.options.getString("datum", true).trim();
            const time = interaction.options.getString("tijd", true).trim();
            const description = interaction.options
                .getString("beschrijving")
                ?.trim() || null;
            const scheduledAt = parseScheduledAt(date, time);

            if (!scheduledAt) {
                return interaction.editReply({
                    content: "❌ Gebruik een geldige datum en tijd, bijvoorbeeld `15-09-2026` en `19:30`."
                });
            }

            const id = agenda.addItem({
                guildId,
                title,
                description,
                scheduledAt,
                createdBy: interaction.user.id
            });

            const updated = await refreshPublishedAgendas(client, guildId);
            return interaction.editReply({
                content:
                    `✅ Agendapunt **#${id}** is toegevoegd voor <t:${scheduledAt}:F>.` +
                    (updated ? ` ${updated} geplaatste agenda('s) bijgewerkt.` : "")
            });
        }

        if (subcommand === "verwijderen") {
            const id = interaction.options.getInteger("id", true);
            const item = agenda.getItem(id, guildId);

            if (!item) {
                return interaction.editReply({
                    content: `❌ Agendapunt **#${id}** bestaat niet in deze server.`
                });
            }

            agenda.removeItem(id, guildId);
            const updated = await refreshPublishedAgendas(client, guildId);

            return interaction.editReply({
                content:
                    `✅ Agendapunt **#${id} – ${item.title}** is verwijderd.` +
                    (updated ? ` ${updated} geplaatste agenda('s) bijgewerkt.` : "")
            });
        }

        if (subcommand === "tonen") {
            const channel = interaction.options.getChannel("kanaal") || interaction.channel;

            if (!channel?.isTextBased?.()) {
                return interaction.editReply({
                    content: "❌ Kies een geldig tekst- of aankondigingskanaal."
                });
            }

            if (!canPublishIn(channel, interaction.guild.members.me)) {
                return interaction.editReply({
                    content:
                        "❌ De bot mist in dat kanaal één of meer rechten: " +
                        "Kanaal bekijken, Berichten verzenden of Links insluiten."
                });
            }

            const result = await publishAgenda(channel);
            return interaction.editReply({
                content: result.updated
                    ? `✅ De bestaande YouTube-agenda in ${channel} is vernieuwd.`
                    : `✅ De YouTube-agenda is geplaatst in ${channel}.`
            });
        }

        return interaction.editReply({
            embeds: buildAgendaEmbeds(guildId)
        });
    }
};
