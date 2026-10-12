const { tr, send } = require("../utils/localization");
const { EmbedBuilder } = require("../utils/discord");

const config = require("../config/config");
const logger = require("../utils/logger");
const databaseManager = require("../database/manager");

function createEmbed(client, status, color, scan = null) {
    const database = databaseManager.stats();
    const fields = [
        { name: "Status", value: status, inline: false },
        { name: tr("Botversie"), value: String(config.Version || tr("Onbekend")), inline: true },
        { name: "Servers", value: String(client.guilds.cache.size), inline: true },
        { name: "Commands", value: String(client.commands.size), inline: true },
        {
            name: "Components",
            value: String(client.buttons.size + client.modals.size + client.selectMenus.size),
            inline: true
        },
        { name: "Database", value: tr("✅ {0} tabellen", database.tables), inline: true }
    ];

    if (scan) {
        fields.push(
            { name: tr("Kanalen gecontroleerd"), value: String(scan.channelsScanned), inline: true },
            { name: tr("Berichten geladen"), value: String(scan.messagesLoaded), inline: true },
            { name: tr("Nieuwe berichten verwerkt"), value: String(scan.messagesProcessed), inline: true },
            { name: tr("XP-momenten verwerkt"), value: String(scan.xpAwards), inline: true }
        );
    }

    return new EmbedBuilder()
        .setColor(color)
        .setTitle(tr("🤖 Bot-opstartcontrole"))
        .addFields(fields)
        .setFooter({ text: config.Bot.Footer })
        .setTimestamp();
}

async function startReport(client) {
    const reports = [];
    for (const guild of client.guilds.cache.values()) {
        await config.__context.run(guild.id, async () => {
            if (!config.StartupReport?.Enabled || !config.StartupReport.Channel) return;

            const channel = guild.channels.cache.get(config.StartupReport.Channel) ||
                await guild.channels.fetch(config.StartupReport.Channel).catch(() => null);

            if (!channel?.isTextBased?.()) {
                logger.warn(`Opstartlogkanaal niet gevonden in ${guild.name}.`);
                return;
            }

            const message = await send(channel, "send", {
                embeds: [createEmbed(client, tr("⏳ Opstart en kanaalscan bezig..."), "#FEE75C")]
            }).catch((error) => {
                logger.warn(`Opstartbericht plaatsen mislukt in ${guild.name}: ${error.message}`);
                return null;
            });
            if (message) reports.push({ guildId: guild.id, message });
        });
    }
    return reports;
}

async function finishReport(reports, client, scan) {
    for (const report of reports || []) {
        await config.__context.run(report.guildId, () => send(report.message, "edit", {
            embeds: [createEmbed(client, tr("✅ Opstart volledig voltooid"), "#57F287", scan)]
        }).catch((error) => {
            logger.warn(`Opstartbericht bijwerken mislukt: ${error.message}`);
        }));
    }
}

async function failReport(reports, client, error) {
    for (const report of reports || []) {
        await config.__context.run(report.guildId, async () => {
            const embed = createEmbed(client, tr("❌ Opstartscan bevat een fout"), "#ED4245")
                .setDescription(String(error?.message || error).slice(0, 1000));
            await send(report.message, "edit", { embeds: [embed] }).catch(() => {});
        });
    }
}

module.exports = {
    startReport,
    finishReport,
    failReport
};
