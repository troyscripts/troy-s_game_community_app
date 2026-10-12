const { tr, send, clip } = require("./localization");
const { EmbedBuilder } = require("./discord");
const config = require('../config/config');
const logger = require('./logger');

function eventEmbed(title, color, description, footer) {
    return new EmbedBuilder().setColor(color).setTitle(title)
        .setDescription(clip(description, 4000))
        .setFooter({ text: clip(footer, 2000) }).setTimestamp();
}
async function sendEmbed(guild, channelId, embed) {
    if (!channelId) return false;
    try {
        const channel = guild.channels.cache.get(channelId);
        if (!channel?.isTextBased?.()) return false;
        await send(channel, "send", { embeds: [embed], allowedMentions: { parse: [], repliedUser: false } });
        return true;
    } catch {
        logger.warn('Event-embed kon niet worden geplaatst. Controleer het kanaal en de rechten Berichten verzenden en Links insluiten.');
        return false;
    }
}
async function sendLog(guild, embed, alreadySentChannel) {
    if (!guild || config.Logging?.Enabled === false || config.Logging?.Channel === alreadySentChannel) return;
    await sendEmbed(guild, config.Logging?.Channel, embed);
}
async function logInteraction(i, state) {
    if (!i.guild || i.isAutocomplete()) return;
    try {
        let kind, action;
        if (i.isChatInputCommand()) {
            kind = 'Slashcommand';
            action = '/' + i.commandName;
            const group = i.options.getSubcommandGroup?.(false);
            const sub = i.options.getSubcommand?.(false);
            if (group) action += ' ' + group;
            if (sub) action += ' ' + sub;
        } else if (i.isButton()) {
            kind = tr("Knop"); action = (i.customId || tr("onbekend")).split(':')[0];
        } else if (i.isModalSubmit()) {
            kind = tr("Formulier"); action = (i.customId || tr("onbekend")).split(':')[0];
        } else if (i.isAnySelectMenu()) {
            kind = tr("Keuzemenu"); action = (i.customId || tr("onbekend")).split(':')[0];
        } else return;
        // Do not copy arguments, form answers, private replies or selected values into logs.
        action = action.replace(/[`\r\n]/g, '').slice(0, 180);
        const color = state === 'Fout' ? 0xED4245 : state === 'Afgehandeld' ? 0x3498DB : 0xFF5722;
        const embed = eventEmbed(tr("Interactie gebruikt"), color,
            tr("**Van:** <@{0}>    **In:** {1}\n\n", i.user.id, i.channelId ? `<#${i.channelId}>` : tr("Onbekend kanaal")) +
            tr("**Type:** {0}\n**Actie:** `{1}`\n**Status:** {2}", kind, action, tr(state)),
            tr("Gebruiker-ID: {0} | Interactie-ID: {1}", i.user.id, i.id));
        await sendLog(i.guild, embed);
    } catch {
        logger.warn('Interactie kon niet als embed worden gelogd.');
    }
}
module.exports = { eventEmbed, sendEmbed, sendLog, logInteraction };
