const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config/config");
const { getSnapshot } = require("../../services/connectionMonitor");

function ms(value) {
    return Number.isFinite(value) ? `${value}ms` : "Onbekend";
}

function formatUptime(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours || days) parts.push(`${hours}u`);
    parts.push(`${minutes}m`);
    return parts.join(" ");
}

function statusIcon(status) {
    return {
        normal: "🟢",
        elevated: "🟡",
        high: "🟠",
        critical: "🔴",
        unknown: "⚪"
    }[status] || "⚪";
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Bekijk de Discord-verbindingsstatus van de bot."),

    category: "Fun",
    guildOnly: false,

    async execute(client, interaction) {
        const sent = await interaction.reply({ content: "🏓 Ping meten...", fetchReply: true });
        const botPing = sent.createdTimestamp - interaction.createdTimestamp;
        const stats = getSnapshot(client);

        const embed = new EmbedBuilder()
            .setColor(config.Bot.Color)
            .setTitle("🏓 Verbindingsstatus")
            .addFields(
                { name: "Bot latency", value: ms(botPing), inline: true },
                { name: "Discord Gateway", value: ms(stats.current), inline: true },
                { name: "Status", value: `${statusIcon(stats.status)} ${stats.statusLabel}`, inline: true },
                { name: "Gemiddelde", value: ms(stats.average), inline: true },
                { name: "Minimum", value: ms(stats.min), inline: true },
                { name: "Maximum", value: ms(stats.max), inline: true },
                { name: "Uptime", value: formatUptime(process.uptime()), inline: true },
                { name: "Metingen", value: String(stats.samples), inline: true },
                { name: "Gateway-events", value: `Disconnects: ${stats.disconnects}\nReconnects: ${stats.reconnects}\nTimeouts: ${stats.timeouts}`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: config.Bot.Footer });

        return interaction.editReply({ content: "", embeds: [embed] });
    }
};
