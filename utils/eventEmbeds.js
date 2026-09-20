const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');
const logger = require('./logger');

function eventEmbed(title, color, description, footer) {
    return new EmbedBuilder().setColor(color).setTitle(title)
        .setDescription(description.slice(0, 4000))
        .setFooter({ text: footer.slice(0, 2000) }).setTimestamp();
}
async function sendEmbed(guild, channelId, embed) {
    if (!channelId) return false;
    try {
        const channel = guild.channels.cache.get(channelId);
        if (!channel?.isTextBased?.()) return false;
        await channel.send({ embeds: [embed], allowedMentions: { parse: [], repliedUser: false } });
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
            kind = 'Knop'; action = (i.customId || 'onbekend').split(':')[0];
        } else if (i.isModalSubmit()) {
            kind = 'Formulier'; action = (i.customId || 'onbekend').split(':')[0];
        } else if (i.isAnySelectMenu()) {
            kind = 'Keuzemenu'; action = (i.customId || 'onbekend').split(':')[0];
        } else return;
        // Do not copy arguments, form answers, private replies or selected values into logs.
        action = action.replace(/[`\r\n]/g, '').slice(0, 180);
        const color = state === 'Fout' ? 0xED4245 : state === 'Afgehandeld' ? 0x3498DB : 0xFF5722;
        const embed = eventEmbed('Interactie gebruikt', color,
            `**Van:** <@${i.user.id}>    **In:** ${i.channelId ? `<#${i.channelId}>` : 'Onbekend kanaal'}\n\n` +
            `**Type:** ${kind}\n**Actie:** \`${action}\`\n**Status:** ${state}`,
            `Gebruiker-ID: ${i.user.id} | Interactie-ID: ${i.id}`);
        await sendLog(i.guild, embed);
    } catch {
        logger.warn('Interactie kon niet als embed worden gelogd.');
    }
}
module.exports = { eventEmbed, sendEmbed, sendLog, logInteraction };
