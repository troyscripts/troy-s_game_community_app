const { tr, send } = require("../../utils/localization");
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
    if (value === "") return tr("*leeg*");
    if (Array.isArray(value)) return value.length ? `\`${JSON.stringify(value)}\`` : tr("*lege lijst*");
    if (typeof value === "boolean") return value ? tr("`ja`") : tr("`nee`");
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
            return send(interaction, "respond", sections
                    .filter((name) => name.toLowerCase().includes(query))
                    .slice(0, 25)
                    .map((name) => ({ name, value: name })));
        }

        const paths = settings.getEditablePaths();
        return send(interaction, "respond", paths
                .filter((path) => path.toLowerCase().includes(query))
                .slice(0, 25)
                .map((path) => ({ name: path, value: path })));
    },

    async execute(_client, interaction) {
        if (!hasOwnerAccess(interaction.member, interaction.user.id)) {
            return send(interaction, "reply", {
                content: tr("❌ Alleen de owner of een ingestelde developer van deze Discord-server kan de configuratie beheren."),
                flags: MessageFlags.Ephemeral
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand === "hulp") {
            return send(interaction, "reply", {
                content:
                    tr("⚙️ **Serverconfiguratie**\n\n") +
                    tr("• `/config bekijken` downloadt de huidige instellingen.\n") +
                    tr("• `/config instellen` wijzigt één instelling direct.\n") +
                    tr("• `/config herstellen` herstelt één veilige standaardwaarde.\n") +
                    tr("• `/config resetten` wist alle serverspecifieke keuzes na bevestiging.\n\n") +
                    tr("**Voorbeelden**\n") +
                    tr("`Counting.Channel` → kies/plak een kanaalvermelding of kanaal-ID\n") +
                    tr("`Tickets.Enabled` → `ja` of `nee`\n") +
                    tr("`Store.VIPRole` → aparte VIP-rol voor /store; de botrol moet erboven staan\n") +
                    tr("`Bump.Channel` → kanaalvermelding/ID voor een herinnering iedere 2 uur; `uit` schakelt deze uit\n") +
                    "`Bot.Color` → `#c9a91b`\n" +
                    tr("`StaffRoles` → laat waarde leeg om rollen aan te klikken, of voer rol-ID's in\n") +
                    tr("`Roles.Developer` → de rol-ID van je developers (volledig botbeheer op deze server)\n") +
                    tr("`Birthday.Messages` → berichten gescheiden door `|`\n\n") +
                    tr("De owner en de ingestelde Developer-rol kunnen dit command gebruiken.\n") +
                    tr("Token, client-ID, botversie, databasepad en globale owners blijven ") +
                    tr("om veiligheidsredenen buiten Discord beheerbaar."),
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
                    return send(interaction, "reply", {
                        content: tr("❌ Dat configuratieonderdeel bestaat niet."),
                        flags: MessageFlags.Ephemeral
                    });
                }
            }

            return send(interaction, "reply", {
                content: section
                    ? tr("⚙️ Hier staat de huidige configuratie van **{0}**.", section)
                    : tr("⚙️ Hier staat de volledige configuratie van deze Discord-server."),
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
                return send(interaction, "reply", { content: tr("❌ Vul voor deze instelling een waarde in. Alleen StaffRoles heeft een rollenkeuzemenu."), flags: MessageFlags.Ephemeral });
            }

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            try {
                const result = settings.updateValue(guildId, path, rawValue);
                if (result.path === "Bump.Channel") await require("../../services/bumpReminder").tick(_client);
                return send(interaction, "editReply", {
                    content:
                        tr("✅ **{0}** is opgeslagen voor alleen deze Discord-server.\n", result.path) +
                        tr("Nieuwe waarde: {0}", displayValue(result.value)),
                    flags: MessageFlags.Ephemeral
                });
            } catch (error) {
                return send(interaction, "editReply", {
                    content: `❌ ${error.message}`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        if (subcommand === "herstellen") {
            const path = interaction.options.getString("instelling", true);
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            try {
                const result = settings.resetValue(guildId, path);
                if (result.path === "Bump.Channel") await require("../../services/bumpReminder").tick(_client);
                return send(interaction, "editReply", {
                    content:
                        tr("✅ **{0}** is hersteld naar de veilige standaard.\n", result.path) +
                        tr("Waarde: {0}", displayValue(result.value)),
                    flags: MessageFlags.Ephemeral
                });
            } catch (error) {
                return send(interaction, "editReply", {
                    content: `❌ ${error.message}`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        const confirmed = interaction.options.getBoolean("bevestigen", true);
        if (!confirmed) {
            return send(interaction, "reply", {
                content: tr("ℹ️ De configuratie is niet gewijzigd."),
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        settings.resetGuild(guildId);
        await require("../../services/bumpReminder").tick(_client);
        return send(interaction, "editReply", {
            content:
                tr("✅ Alle instellingen voor deze Discord-server zijn teruggezet. ") +
                tr("Kanaal- en rol-ID's zijn leeggemaakt; stel ze opnieuw in met `/config instellen`."),
            flags: MessageFlags.Ephemeral
        });
    }
};
