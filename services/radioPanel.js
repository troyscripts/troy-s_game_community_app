"use strict";
const { tr, send } = require('../utils/localization');
const { MessageFlags } = require('discord.js');
const cooldowns = new Map();
function payload(options) {
    const stations = Object.entries(options.Stations).filter(([, s]) => s.Url).slice(0, 25);
    const components = [];
    if (stations.length) components.push({ type: 1, components: [{ type: 3, custom_id: 'radio:select',
        placeholder: tr('Kies een radiozender'), min_values: 1, max_values: 1,
        options: stations.map(([key, s]) => ({ label: (s.Name || key).slice(0, 80), value: key.replace('Station', ''), emoji: { name: '📻' } })) }] });
    components.push({ type: 1, components: [
        { type: 2, custom_id: 'radio:down', label: tr('Zachter'), emoji: { name: '🔉' }, style: 2 },
        { type: 2, custom_id: 'radio:up', label: tr('Harder'), emoji: { name: '🔊' }, style: 2 },
        { type: 2, custom_id: 'radio:status', label: tr('Nu luisteren'), style: 1 },
        { type: 2, custom_id: 'radio:stop', label: tr('Stop radio'), style: 4 }
    ] });
    return { embeds: [{ title: tr('📻 Samen radio luisteren'), color: 0xc9a91b,
        description: tr('Ga in deze call zitten en kies hieronder een zender. Iedereen in de call luistert mee.\nMet de knoppen regel je het volume of stop je de radio. Gebruik Nu luisteren voor de actuele zender en het volume.') +
            (stations.length ? '' : '\n\n' + tr('Nog geen zenders ingesteld. Een beheerder kan /radio instellen gebruiken.')) }], components, allowedMentions: { parse: [] } };
}
async function interact(client, interaction) {
    if (!interaction.inGuild() || interaction.message?.author?.id !== client.user.id) return;
    const now = Date.now();
    // Bound memory and prevent rapid repeated component clicks; slash commands have their own cooldown.
    for (const [key, time] of cooldowns) if (now - time >= 3000) cooldowns.delete(key);
    const key = interaction.guildId + ':' + interaction.user.id;
    if (cooldowns.has(key)) return send(interaction, 'reply', { content: tr('Wacht even voordat je de radio opnieuw bedient.'), flags: MessageFlags.Ephemeral });
    cooldowns.set(key, now);
    const kind = interaction.customId.split(':')[1];
    let action;
    if (kind === 'select') {
        const slot = Number(interaction.values?.[0]);
        if (!Number.isInteger(slot) || slot < 1 || slot > 25) return send(interaction, 'reply', { content: tr('Ongeldige zender.'), flags: MessageFlags.Ephemeral });
        action = { sub: 'start', slot };
    } else if (kind === 'up' || kind === 'down') action = { sub: 'volume', delta: kind === 'up' ? 10 : -10 };
    else if (kind === 'stop' || kind === 'status') action = { sub: kind };
    else return;
    return require('../commands/community/radio').run(client, interaction, action);
}
module.exports = { payload, interact };
