'use strict';
const { escapeMarkdown } = require('discord.js');
const clean = value => escapeMarkdown(String(value ?? '').replace(/[\r\n\x00-\x1f\x7f]/g, ' ').slice(0, 150));
const idOf = value => typeof value === 'string' ? value : value?.id || value?.user?.id;
const withId = (name, id) => `${name}${id ? ` · ID: \`${clean(id)}\`` : ''}`;
function user(guild, value) {
    const id = idOf(value);
    const member = (typeof value === 'object' && value?.user ? value : null) || guild?.members?.cache?.get(id);
    const account = member?.user || (typeof value === 'object' ? value : null) || guild?.client?.users?.cache?.get(id);
    const name = member?.displayName || member?.nick || account?.globalName || account?.username || account?.tag;
    const username = account?.username;
    return withId(name ? clean(name) + (username && username !== name ? ` (@${clean(username)})` : '') : 'Onbekende gebruiker', id);
}
function channel(guild, value) {
    if (value == null) return 'Geen kanaal';
    const id = idOf(value);
    const entity = typeof value === 'object' ? value : guild?.channels?.cache?.get(id);
    return withId(entity?.name ? `#${clean(entity.name)}` : 'Onbekend of verwijderd kanaal', id);
}
function role(guild, value) {
    const id = idOf(value);
    const entity = typeof value === 'object' ? value : guild?.roles?.cache?.get(id);
    return withId(entity?.name ? clean(entity.name) : 'Onbekende of verwijderde rol', id);
}
function target(guild, value, type) {
    if (type === 'User' || value?.username || value?.user) return user(guild, value);
    if (type === 'Channel') return channel(guild, value);
    if (type === 'Role') return role(guild, value);
    const id = idOf(value);
    const entity = typeof value === 'object' ? value : null;
    if (entity?.name) return withId(clean(entity.name), id);
    if (guild?.members?.cache?.has(id)) return user(guild,id);
    if (guild?.channels?.cache?.has(id)) return channel(guild,id);
    if (guild?.roles?.cache?.has(id)) return role(guild,id);
    return withId('Onbekend doel',id);
}
function messageLink(message) {
    const guildId = message?.guildId || message?.guild?.id;
    const channelId = message?.channelId || message?.channel?.id;
    const id = message?.id;
    if ([guildId,channelId,id].every(v=>/^\d{17,20}$/.test(v || '')))
        return `[Open bericht](https://discord.com/channels/${guildId}/${channelId}/${id})\nBericht-ID: \`${id}\``;
    return withId('Bericht niet beschikbaar',id);
}
module.exports = {clean,user,channel,role,target,messageLink};
