const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { PermissionFlagsBits, ChannelType } = require('discord.js');
const store = require('../database/notify');
const providers = require('./notify/providers');
const logger = require('../utils/logger');
const config = require('../config/config');
let timer = null;
let active = null;
let stopped = true;
const failures = new Map();

function checkChannel(channel, guildId) {
    if (!channel || channel.guild?.id !== guildId || ![ChannelType.GuildText,ChannelType.GuildAnnouncement].includes(channel.type)) throw new Error('Kies een tekst- of aankondigingskanaal in deze server.');
    const permissions = channel.permissionsFor(channel.guild.members.me);
    if (!permissions?.has([PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.EmbedLinks])) throw new Error('De bot mist Kanaal bekijken, Berichten verzenden of Links insluiten in het meldingskanaal.');
}
function withPingRole(row) {
    if (!row.role_slot) return row;
    return config.__context.run(row.guild_id,() => ({...row,role_id:config.Notify?.[`PingRole${row.role_slot}`] || null}));
}
function payload(row,item,test = false) {
    const names = {youtube:'YouTube',tiktok:'TikTok'};
    const message = (row.message || '{creator} heeft een nieuwe video op {platform}!')
        .replace(/\{creator\}/g,() => row.account).replace(/\{platform\}/g,() => names[row.platform]).replace(/\{titel\}/g,() => item.title).replace(/\{url\}/g,() => item.url);
    const embed = {title:(test ? 'TEST — ' : '') + item.title.slice(0,245),url:item.url,color:row.platform === 'youtube' ? 0xff0000 : 0x25f4ee,
        footer:{text:`${names[row.platform]} • ${row.account}`}};
    if (item.image) embed.image = {url:item.image};
    // nonce + enforceNonce closes the normal retry window after an ambiguous send timeout.
    const nonce = createHash('sha256').update(`${row.guild_id}:${row.id}:${item.id}`).digest('hex').slice(0,24);
    return {content:((test ? '**Testmelding**\n' : (row.role_id ? `<@&${row.role_id}> ` : ''))+message).slice(0,1900),embeds:[embed],
        allowedMentions:{parse:[],roles:!test && row.role_id ? [row.role_id] : [],users:[]},
        ...(!test ? {nonce,enforceNonce:true} : {})};
}
async function deliver(client,row) {
    for (const pending of store.pending(row.id)) {
        if (stopped) return;
        const current = store.get(row.id,row.guild_id);
        if (!current) return;
        const guild = client.guilds.cache.get(current.guild_id);
        if (!guild) return;
        const channel = await guild.channels.fetch(current.channel_id);
        if (stopped) return;
        const latest = store.get(row.id,row.guild_id);
        const fresh = latest && withPingRole(latest);
        if (!fresh || fresh.channel_id !== current.channel_id) return;
        checkChannel(channel,current.guild_id);
        if (fresh.role_id) {
            const role = await guild.roles.fetch(fresh.role_id);
            if (!role || role.id === guild.id || role.managed || (!role.mentionable && !channel.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.MentionEveryone))) throw new Error('De ingestelde pingrol bestaat niet of kan niet worden vermeld.');
        }
        if (stopped) return;
        await channel.send(payload(fresh,JSON.parse(pending.payload)));
        store.sent(row.id,pending.item_id);
    }
}
async function tick(client) {
    if (stopped || !client.isReady()) return;
    store.init();
    // Channel IDs are unique: only the owning guild receives Troy's presets.
    const presetPath = path.resolve(__dirname,'../data/notify-presets.json');
    if (fs.existsSync(presetPath)) {
        const presets = JSON.parse(fs.readFileSync(presetPath,'utf8'));
        for (const preset of presets) {
            if (store.seeded(preset.channelId)) continue;
            if (!/^\d{17,20}$/.test(preset.channelId) || !Array.isArray(preset.creators)) throw new Error('Ongeldige notify-startinstellingen.');
            for (const creator of preset.creators) creator.account = providers.account(creator.platform,creator.account);
            const channel = await client.channels.fetch(preset.channelId).catch(() => null);
            if (stopped) return;
            if (channel?.guild && client.guilds.cache.has(channel.guild.id)) store.seed(channel.guild.id,preset);
            else if (!failures.has('preset:'+preset.channelId)) {
                logger.warn('Notify-startinstellingen: opgegeven kanaal niet bereikbaar. Controleer of deze bot toegang tot het kanaal heeft.');
                failures.set('preset:'+preset.channelId,{});
            }
        }
    }
    for (const row of store.list()) {
        if (stopped) return;
        if (!client.guilds.cache.has(row.guild_id)) continue;
        const failure = failures.get(row.id);
        if (failure?.until > Date.now()) continue;
        try {
            // Continue discovery during Discord failures and delivery during platform failures.
            let fetchError = null;
            try {
                const result = await providers[row.platform](row);
                if (stopped) return;
                if (result.resolvedId) store.resolved(row.id,result.resolvedId);
                store.ingest(row,result.items.sort((a,b) => a.published-b.published));
            } catch (error) { fetchError = error; }
            if (stopped) return;
            await deliver(client,row);
            if (fetchError) throw fetchError;
            failures.delete(row.id);
        } catch (error) {
            if (stopped) return;
            const message = error.message || 'Onbekende notify-fout';
            const count = (failure?.count || 0)+1;
            store.error(row.id,message);
            failures.set(row.id,{count,until:Date.now()+Math.min(60,5*2**Math.min(count-1,4))*60000,message});
            if (failure?.message !== message) logger.warn(`Notify #${row.id} (${row.platform}): ${message}`);
        }
    }
}
function startNotify(client) {
    if (timer) return;
    stopped = false;
    const run = () => {
        if (active) return;
        active = tick(client).catch(() => logger.warn('Notify-controle mislukt; nieuwe poging over vijf minuten.')).finally(() => { active = null; });
    };
    run();
    timer = setInterval(run,5*60000); timer.unref();
}
async function stopNotify() {
    stopped = true;
    if (timer) clearInterval(timer);
    timer = null;
    if (active) await active;
}
function retry(id) { failures.delete(id); }
module.exports = {withPingRole,startNotify,stopNotify,payload,checkChannel,retry};
