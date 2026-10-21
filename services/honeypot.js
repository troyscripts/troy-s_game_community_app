'use strict';
const { PermissionFlagsBits: P, MessageFlags } = require('discord.js');
const settings = require('../database/guildSettings');
const cases = require('../database/honeypot');
const { tr, send, sendLogMessage } = require('../utils/localization');
const logger = require('../utils/logger');
const WEEK = 7 * 86400000;
const locks = new Map();
function locked(key,fn) {
    const task=(locks.get(key)||Promise.resolve()).catch(()=>{}).then(fn);
    locks.set(key,task);
    return task.finally(()=>{if(locks.get(key)===task)locks.delete(key);});
}
function matches(message,cfg) {
    return Boolean(cfg?.Enabled && cfg.Channel && message.guild &&
        (message.channelId===cfg.Channel || (message.channel?.isThread?.() && message.channel.parentId===cfg.Channel)));
}
async function logCase(message,row,cfg) {
    const logId=cfg.Honeypot.LogChannel||cfg.Logging.Channel;
    if(!logId) { logger.warn(`Honeypot ${row.id}: geen logkanaal ingesteld; status ${row.status}.`); return; }
    try {
        const channel=await message.guild.channels.fetch(logId);
        if(!channel?.isTextBased() || channel.guild.id!==row.guild_id) throw Error('Ongeldig logkanaal');
        const active=row.status==='active';
        const result=await sendLogMessage(channel,'send',{
            embeds:[{title:tr('🍯 Honeypot'),color:active?0xE74C3C:0xF39C12,
                description:tr('Gebruiker: <@{0}> ({0})\nKanaal: <#{1}>\nActie: {2}\nStatus: {3}',row.user_id,row.channel_id,tr(row.action==='ban'?'Ban':'Time-out van 7 dagen'),tr(active?'Uitgevoerd':'Mislukt')),
                fields:[{name:tr('Bericht'),value:`https://discord.com/channels/${row.source_guild||row.guild_id}/${row.channel_id}/${row.source_message||row.id}`},
                    ...(row.source_guild && row.source_guild!==row.guild_id?[{name:tr('Bronserver'),value:row.source_guild}]:[]),
                    ...(row.error?[{name:tr('Fout'),value:row.error}]:[])],
                footer:{text:`Honeypot ${row.id}`},timestamp:new Date().toISOString()}],
            components:active?[{type:1,components:[{type:2,style:2,custom_id:`honeypot:${row.id}`,
                label:tr(row.action==='ban'?'Ban opheffen':'Time-out opheffen')}]}]:[],
            allowedMentions:{parse:[]}
        });
        cases.log(row.id,channel.id,result.id);
    } catch(error) { logger.warn(`Honeypot ${row.id}: log mislukt (${error.message}).`); }
}
async function handleMessage(message) {
    if(!message.guild || !message.author || message.author.bot || message.webhookId || message.system) return false;
    const cfg=settings.getGuildConfig(message.guild.id);
    if(!matches(message,cfg.Honeypot)) return false;
    const handled = await locked(`${message.guild.id}:${message.author.id}`,async()=>{
        // Settings may have changed while this event waited behind another message.
        const current=settings.getGuildConfig(message.guild.id);
        if(!matches(message,current.Honeypot)) return true;
        if(cases.get(message.id)) return true;
        const action=current.Honeypot.Action;
        const reason=`Honeypot ${message.id}: bericht in kanaal ${message.channelId}`;
        cases.create({id:message.id,guild_id:message.guild.id,user_id:message.author.id,channel_id:message.channelId,action,reason});
        try {
            if(!['ban','timeout'].includes(action)) throw Error(tr('Ongeldige Honeypot.Action'));
            const me=await message.guild.members.fetchMe();
            const member=await message.guild.members.fetch({user:message.author.id,force:true});
            if(action==='ban') {
                if(!me.permissions.has(P.BanMembers)||!member.bannable) throw Error(tr('Ban niet mogelijk: controleer Ban Members en rolpositie.'));
                await member.ban({reason,deleteMessageSeconds:7 * 86400});
                cases.active(message.id);
            } else {
                if(!me.permissions.has(P.ModerateMembers)||!member.moderatable) throw Error(tr('Time-out niet mogelijk: controleer Moderate Members en rolpositie.'));
                const previous=member.communicationDisabledUntilTimestamp||0;
                // Do not overwrite an existing moderation action or a previous honeypot timeout.
                if(previous>Date.now()) throw Error(tr('Gebruiker heeft al een actieve time-out; deze is behouden.'));
                const until=Date.now()+WEEK;
                await member.disableCommunicationUntil(until,reason);
                cases.active(message.id,until,previous);
            }
        } catch(error) { cases.failed(message.id,error.message); logger.warn(`Honeypot ${message.id}: ${error.message}`); }
        await logCase(message,cases.get(message.id),current);
        return true;
    });
    const source=cases.get(message.id);
    if(source?.status==='active' && ['ban','timeout'].includes(source.action) && settings.getGuildConfig(message.guild.id).Honeypot.CrossServerBan) {
        await propagate(message,source.action);
    }
    return handled;
}
async function propagate(message,action) {
    for(const guild of message.guild.client?.guilds.cache.values()||[]) {
        if(guild.id===message.guild.id)continue;
        try {
            await locked(`${guild.id}:${message.author.id}`,async()=>{
                const cfg=settings.getGuildConfig(guild.id);
                if(!cfg.Honeypot.CrossServerBan)return;
                const id=`${message.id}_${guild.id}`;
                if(cases.get(id))return;
                let member;
                try {member=await guild.members.fetch({user:message.author.id,force:true});}
                catch(error) {if(Number(error.code)===10007)return;throw error;}
                const reason=`Honeypot ${id}: bronserver ${message.guild.id}`;
                cases.create({id,guild_id:guild.id,user_id:message.author.id,channel_id:message.channelId,action,reason,source_guild:message.guild.id,source_message:message.id});
                try {
                    const me=await guild.members.fetchMe();
                    if(action==='ban') {
                        if(!me.permissions.has(P.BanMembers)||!member.bannable)throw Error(tr('Ban niet mogelijk: controleer Ban Members en rolpositie.'));
                        await member.ban({reason,deleteMessageSeconds:7*86400});
                        cases.active(id);
                    } else {
                        if(!me.permissions.has(P.ModerateMembers)||!member.moderatable)throw Error(tr('Time-out niet mogelijk: controleer Moderate Members en rolpositie.'));
                        const previous=member.communicationDisabledUntilTimestamp||0;
                        if(previous>Date.now())throw Error(tr('Gebruiker heeft al een actieve time-out; deze is behouden.'));
                        const until=Date.now()+WEEK;
                        await member.disableCommunicationUntil(until,reason);
                        cases.active(id,until,previous);
                    }
                }catch(error){cases.failed(id,error.message);}
                await logCase({guild},cases.get(id),cfg);
            });
        }catch(error){logger.warn(`Honeypot netwerk [${guild.id}]: ${error.message}`);}
    }
}
async function undo(client,i) {
    await i.deferReply({flags:MessageFlags.Ephemeral});
    const reply=content=>send(i,'editReply',{content,allowedMentions:{parse:[]}});
    const id=/^honeypot:(\d{17,20}(?:_\d{17,20})?)$/.exec(i.customId)?.[1];
    const initial=id&&cases.get(id);
    if(!i.guild || !initial || initial.guild_id!==i.guildId || initial.log_message!==i.message?.id || initial.log_channel!==i.channelId || i.message?.author?.id!==client.user.id)
        return reply(tr('Deze honeypot-knop is niet geldig.'));
    return locked(`${i.guildId}:${initial.user_id}`,async()=>{
        const row=cases.get(id);
        if(row.status!=='active') return reply(tr('Deze maatregel is al afgehandeld.'));
        try {
            const actor=await i.guild.members.fetch({user:i.user.id,force:true});
            const permission=row.action==='ban'?P.BanMembers:P.ModerateMembers;
            if(!actor.permissions.has(permission)) return reply(tr('Je hebt geen rechten om deze maatregel op te heffen.'));
            const me=await i.guild.members.fetchMe();
            if(!me.permissions.has(permission)) return reply(tr('De bot mist de benodigde moderatierechten.'));
            if(row.action==='ban') {
                const ban=await i.guild.bans.fetch(row.user_id).catch(error=>{if(Number(error.code)===10026)return null;throw error;});
                if(ban && ban.reason!==row.reason) return reply(tr('De maatregel is later gewijzigd. Gebruik de gewone moderatiecommando’s.'));
                if(ban) await i.guild.members.unban(row.user_id,`Honeypot ${id} opgeheven door ${i.user.id}`);
            } else {
                const target=await i.guild.members.fetch({user:row.user_id,force:true}).catch(error=>{if(Number(error.code)===10007)return null;throw error;});
                if(target && target.communicationDisabledUntilTimestamp>Date.now()) {
                    if(target.communicationDisabledUntilTimestamp!==row.timeout_until) return reply(tr('De maatregel is later gewijzigd. Gebruik de gewone moderatiecommando’s.'));
                    if(actor.id===target.id || (actor.id!==i.guild.ownerId && actor.roles.highest.comparePositionTo(target.roles.highest)<=0)) return reply(tr('Je kunt geen gebruiker met een gelijke of hogere rol beheren.'));
                    if(!target.moderatable) return reply(tr('De bot kan deze gebruiker niet beheren. Controleer de rolpositie.'));
                    await target.disableCommunicationUntil(null,`Honeypot ${id} opgeheven door ${i.user.id}`);
                }
            }
            cases.resolve(id,i.user.id);
            await sendLogMessage(i.message,'edit',{components:[],content:tr('✅ Maatregel opgeheven of al verlopen. Afgehandeld door <@{0}>.',i.user.id),allowedMentions:{parse:[]}})
                .catch(error=>logger.warn(`Honeypot ${id}: log bijwerken mislukt (${error.message}).`));
            return reply(tr('✅ De maatregel is opgeheven of was al verlopen. Een unban voegt iemand niet automatisch opnieuw toe aan de server.'));
        } catch(error) {
            logger.warn(`Honeypot ${id}: opheffen mislukt (${error.message}).`);
            return reply(tr('Opheffen mislukt. Controleer de rechten en probeer opnieuw.'));
        }
    });
}
module.exports={handleMessage,undo,matches,WEEK};
