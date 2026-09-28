const {
    AttachmentBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder
} = require("discord.js");

const settings = require("../../database/guildSettings");
const { hasOwnerAccess } = require("../../utils/permissions");

function jsonAttachment(data, guildId, section = null) {
    const content = section ? { [section]: data[section] } : data;
    const filename = section
        ? `config-${guildId}-${section.toLowerCase()}.json`
        : `config-${guildId}.json`;

    return new AttachmentBuilder(
        Buffer.from(`${JSON.stringify(content, null, 2)}\n`, "utf8"),
        { name: filename }
    );
}

function displayValue(value) {
    if (value === "") return "*leeg*";
    if (Array.isArray(value)) return value.length ? `\`${JSON.stringify(value)}\`` : "*lege lijst*";
    if (typeof value === "boolean") return value ? "`ja`" : "`nee`";
    return `\`${String(value).replaceAll("`", "ˋ")}\``;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("config")
        .setDescription("Bekijk of wijzig de instellingen van deze Discord-server")
        .setDefaultMemberPermissions(null)
        .addSubcommand((subcommand) => subcommand
            .setName("bekijken")
            .setDescription("Download de huidige configuratie of één onderdeel")
            .addStringOption((option) => option
                .setName("onderdeel")
                .setDescription("Optioneel onderdeel, bijvoorbeeld Tickets")
                .setAutocomplete(true)))
        .addSubcommand((subcommand) => subcommand
            .setName("instellen")
            .setDescription("Wijzig één instelling; de wijziging wordt direct opgeslagen")
            .addStringOption((option) => option
                .setName("instelling")
                .setDescription("Bijvoorbeeld Counting.Channel")
                .setRequired(true)
                .setAutocomplete(true))
            .addStringOption((option) => option
                .setName("waarde")
                .setDescription("Nieuwe waarde; laat leeg bij StaffRoles om rollen aan te klikken")
                .setRequired(false)))
        .addSubcommand((subcommand) => subcommand
            .setName("herstellen")
            .setDescription("Maak één instelling weer leeg of zet de veilige standaard terug")
            .addStringOption((option) => option
                .setName("instelling")
                .setDescription("De instelling die hersteld moet worden")
                .setRequired(true)
                .setAutocomplete(true)))
        .addSubcommand((subcommand) => subcommand
            .setName("exporteren")
            .setDescription("Download alle serverinstellingen als JSON-bestand"))
        .addSubcommand((subcommand) => subcommand
            .setName("resetten")
            .setDescription("Zet alle instellingen van deze server terug naar veilige standaarden")
            .addBooleanOption((option) => option
                .setName("bevestigen")
                .setDescription("Kies Ja om alle serverinstellingen te resetten")
                .setRequired(true)))
        .addSubcommand((subcommand) => subcommand
            .setName("hulp")
            .setDescription("Toon uitleg en voorbeelden voor het configuratiecommand")),

    category: "Beheer",
    guildOnly: true,
    dmAllowed: false,
    ownerOnly: true,
    cooldown: 1,

    async autocomplete(_client, interaction) {
        const focused = interaction.options.getFocused(true);
        const query = String(focused.value || "").toLowerCase();

        if (focused.name === "onderdeel") {
            const sections = Object.keys(settings.createCleanServerConfig());
            return interaction.respond(
                sections
                    .filter((name) => name.toLowerCase().includes(query))
                    .slice(0, 25)
                    .map((name) => ({ name, value: name }))
            );
        }

        const paths = settings.getEditablePaths();
        return interaction.respond(
            paths
                .filter((path) => path.toLowerCase().includes(query))
                .slice(0, 25)
                .map((path) => ({ name: path, value: path }))
        );
    },

    async execute(_client, interaction) {
        if (!hasOwnerAccess(interaction.member, interaction.user.id)) {
            return interaction.reply({
                content: "❌ Alleen de owner of een ingestelde developer van deze Discord-server kan de configuratie beheren.",
                flags: MessageFlags.Ephemeral
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand === "hulp") {
            return interaction.reply({
                content:
                    "⚙️ **Serverconfiguratie**\n\n" +
                    "• `/config bekijken` downloadt de huidige instellingen.\n" +
                    "• `/config instellen` wijzigt één instelling direct.\n" +
                    "• `/config herstellen` herstelt één veilige standaardwaarde.\n" +
                    "• `/config resetten` wist alle serverspecifieke keuzes na bevestiging.\n\n" +
                    "**Voorbeelden**\n" +
                    "`Counting.Channel` → kies/plak een kanaalvermelding of kanaal-ID\n" +
                    "`Tickets.Enabled` → `ja` of `nee`\n" +
                    "`Bot.Color` → `#c9a91b`\n" +
                    "`StaffRoles` → laat waarde leeg om rollen aan te klikken, of voer rol-ID's in\n" +
                    "`Roles.Developer` → de rol-ID van je developers (volledig botbeheer op deze server)\n" +
                    "`Birthday.Messages` → berichten gescheiden door `|`\n\n" +
                    "De owner en de ingestelde Developer-rol kunnen dit command gebruiken.\n" +
                    "Token, client-ID, botversie, databasepad en globale owners blijven " +
                    "om veiligheidsredenen buiten Discord beheerbaar.",
                flags: MessageFlags.Ephemeral
            });
        }

        if (subcommand === "bekijken" || subcommand === "exporteren") {
            const data = settings.exportGuild(guildId);
            let section = subcommand === "bekijken"
                ? interaction.options.getString("onderdeel")
                : null;

            if (section) {
                section = Object.keys(data).find(
                    (key) => key.toLowerCase() === section.toLowerCase()
                );
                if (!section) {
                    return interaction.reply({
                        content: "❌ Dat configuratieonderdeel bestaat niet.",
                        flags: MessageFlags.Ephemeral
                    });
                }
            }

            return interaction.reply({
                content: section
                    ? `⚙️ Hier staat de huidige configuratie van **${section}**.`
                    : "⚙️ Hier staat de volledige configuratie van deze Discord-server.",
                files: [jsonAttachment(data, guildId, section)],
                flags: MessageFlags.Ephemeral
            });
        }

        if (subcommand === "instellen") {
            const path = interaction.options.getString("instelling", true);
            const rawValue = interaction.options.getString("waarde");
            if (path.trim().toLowerCase() === "staffroles" && rawValue === null) {
                return require("../../services/configStaffRoles").open(interaction);
            }
            if (rawValue === null) {
                return interaction.reply({ content: "❌ Vul voor deze instelling een waarde in. Alleen StaffRoles heeft een rollenkeuzemenu.", flags: MessageFlags.Ephemeral });
            }

            try {
                const result = settings.updateValue(guildId, path, rawValue);
                return interaction.reply({
                    content:
                        `✅ **${result.path}** is opgeslagen voor alleen deze Discord-server.\n` +
                        `Nieuwe waarde: ${displayValue(result.value)}`,
                    flags: MessageFlags.Ephemeral
                });
            } catch (error) {
                return interaction.reply({
                    content: `❌ ${error.message}`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        if (subcommand === "herstellen") {
            const path = interaction.options.getString("instelling", true);
            try {
                const result = settings.resetValue(guildId, path);
                return interaction.reply({
                    content:
                        `✅ **${result.path}** is hersteld naar de veilige standaard.\n` +
                        `Waarde: ${displayValue(result.value)}`,
                    flags: MessageFlags.Ephemeral
                });
            } catch (error) {
                return interaction.reply({
                    content: `❌ ${error.message}`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        const confirmed = interaction.options.getBoolean("bevestigen", true);
        if (!confirmed) {
            return interaction.reply({
                content: "ℹ️ De configuratie is niet gewijzigd.",
                flags: MessageFlags.Ephemeral
            });
        }

        settings.resetGuild(guildId);
        return interaction.reply({
            content:
                "✅ Alle instellingen voor deze Discord-server zijn teruggezet. " +
                "Kanaal- en rol-ID's zijn leeggemaakt; stel ze opnieuw in met `/config instellen`.",
            flags: MessageFlags.Ephemeral
        });
    }
};
