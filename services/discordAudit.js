'use strict';
const { PermissionFlagsBits: P, AuditLogEvent, Events } = require('discord.js');
const config = require('../config/config');
const logger = require('../utils/logger');
const names = require('../utils/logNames');
const { sendLogMessage, tr } = require('../utils/localization');
const CATEGORIES = ['Messages','MessageEdits','MessageDeletes','Reactions','Members','Roles','Channels','Threads','Voice','Moderation','Invites','Server','Expressions','ScheduledEvents','Integrations','AutoMod','Commands','Audit','Presence','Typing','Polls'];
let initialized=false, timer, busy=false, lastCleanup=0;
const installed=new WeakSet();
function db(){
    const d=require('../database/database').db;
    if(!initialized){
        d.exec(`CREATE TABLE IF NOT EXISTS discord_event_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, category TEXT NOT NULL,
            channel_id TEXT NOT NULL, payload TEXT NOT NULL, created_at INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
            next_attempt INTEGER NOT NULL DEFAULT 0, error TEXT);
            CREATE INDEX IF NOT EXISTS discord_logs_pending ON discord_event_logs(status,next_attempt);
            CREATE INDEX IF NOT EXISTS discord_logs_guild ON discord_event_logs(guild_id,id);`);
        initialized=true;
    }
    return d;
}
const trim=(v,n=1000)=>String(v??'onbekend').slice(0,n);
const idOf=v=>v?.id||v?.user?.id||'onbekend';
const who=v=>names.user(v?.guild,v);
function plain(v){
    if(v===undefined||v===null)return 'onbekend';
    if(typeof v==='boolean')return tr(v ? 'Ja' : 'Nee');
    if(typeof v==='bigint')return String(v);
    if(typeof v==='object')return trim(JSON.stringify(v, (key,value)=>/token|secret|password|authorization|webhook_url/i.test(key)?'[afgeschermd]':typeof value==='bigint'?String(value):value),1500);
    return trim(v,1500);
}
function route(category){return config.Logging?.Channels?.[category]||config.Logging?.Channel||'';}
function enabled(category){return config.Logging?.Enabled!==false && config.Logging?.Events?.[category]!==false && !(category==='MessageDeletes'&&config.Logging?.MessageDelete===false);}
function envelope(title, description='', fields=[]){
    let budget=5400-trim(title,200).length;
    const desc=trim(description,Math.min(3000,budget));budget-=desc.length;
    const clean=[];
    for(const f of fields.slice(0,20)){
        const name=trim(f.name,150);const value=trim(f.value,Math.min(1000,Math.max(0,budget-name.length)));
        if(!value)break;
        clean.push({name,value,inline:false});budget-=name.length+value.length;
    }
    return {embeds:[{title:trim(title,200),description:desc||undefined,color:0x5865F2,fields:clean,timestamp:new Date().toISOString()}],allowedMentions:{parse:[],repliedUser:false}};
}
function enqueue(guild,category,title,description='',fields=[]){
    if(!guild?.id||!CATEGORIES.includes(category))return null;
    return config.__context.run(guild.id,()=>{
        if(!enabled(category))return null;
        const channel=route(category);
        // No destination configured: do not silently collect message content on disk.
        if(!channel)return null;
        const d=db(),now=Date.now();
        const pending=d.prepare("SELECT COUNT(*) n FROM discord_event_logs WHERE guild_id=? AND status='pending'").get(guild.id).n;
        const status=pending>=config.Logging.QueueLimit?'failed':'pending';
        const payload=envelope(title,description,fields);
        const result=d.prepare('INSERT INTO discord_event_logs(guild_id,category,channel_id,payload,created_at,status,error) VALUES(?,?,?,?,?,?,?)')
            .run(guild.id,category,channel,JSON.stringify(payload),now,status,status==='failed'?'Wachtrijlimiet bereikt; lokaal bewaard':null);
        d.prepare('DELETE FROM discord_event_logs WHERE guild_id=? AND (created_at<? OR id NOT IN (SELECT id FROM discord_event_logs WHERE guild_id=? ORDER BY id DESC LIMIT ?))')
            .run(guild.id,now-config.Logging.RetentionDays*86400000,guild.id,config.Logging.MaxRecords);
        return Number(result.lastInsertRowid);
    });
}
async function drain(client){
    if(busy)return;busy=true;
    try{
        if(Date.now()-lastCleanup>3600000){
            for(const {guild_id} of db().prepare('SELECT DISTINCT guild_id FROM discord_event_logs').all()) {
                config.__context.run(guild_id,()=>db().prepare('DELETE FROM discord_event_logs WHERE guild_id=? AND created_at<?').run(guild_id,Date.now()-config.Logging.RetentionDays*86400000));
            }
            lastCleanup=Date.now();
        }
        // Round-robin guild selection prevents one noisy server starving the others.
        const groups=db().prepare("SELECT guild_id,MIN(id) first_id FROM discord_event_logs WHERE status='pending' AND next_attempt<=? GROUP BY guild_id ORDER BY first_id LIMIT 10").all(Date.now());
        for(const group of groups){
            const row=db().prepare("SELECT * FROM discord_event_logs WHERE guild_id=? AND status='pending' AND next_attempt<=? ORDER BY id LIMIT 1").get(group.guild_id,Date.now());
            if(!row)continue;
            await config.__context.run(row.guild_id,async()=>{
                if(!enabled(row.category)){
                    db().prepare("UPDATE discord_event_logs SET status='cancelled',error='Logcategorie uitgeschakeld' WHERE id=?").run(row.id);return;
                }
                try{
                    const guild=client.guilds.cache.get(row.guild_id);
                    if(!guild)throw new Error('Bot is niet beschikbaar in deze server');
                    // Resolve current routing: config corrections also repair queued deliveries.
                    const target=route(row.category);
                    if(!target)throw new Error('Geen logkanaal ingesteld');
                    const channel=await guild.channels.fetch(target);
                    if(!channel||channel.guild?.id!==guild.id||!channel.isTextBased?.()||typeof channel.send!=='function')throw new Error('Loglocatie is geen tekstkanaal in deze server');
                    const perms=channel.permissionsFor(guild.members.me);
                    const required=[P.ViewChannel,P.EmbedLinks,channel.isThread?.()?P.SendMessagesInThreads:P.SendMessages];
                    if(!perms?.has(required))throw new Error('Bot mist kanaaltoegang, berichten verzenden of links insluiten');
                    const payload=JSON.parse(row.payload);
                    // Stable nonce reduces duplicates when Discord accepted a send but the reply was lost.
                    payload.nonce=String(row.id);payload.enforceNonce=true;
                    await sendLogMessage(channel,'send',payload);
                    db().prepare("UPDATE discord_event_logs SET status='sent',channel_id=?,attempts=attempts+1,error=NULL WHERE id=?").run(target,row.id);
                }catch(error){
                    const attempts=row.attempts+1;
                    db().prepare('UPDATE discord_event_logs SET status=?,attempts=?,next_attempt=?,error=? WHERE id=?')
                        .run(attempts>=5?'failed':'pending',attempts,Date.now()+Math.min(300000,5000*2**attempts),trim(error.message,500),row.id);
                    if(attempts===1||attempts===5)logger.warn(`Discordlog ${row.id} (${row.category}, server ${names.clean(client.guilds.cache.get(row.guild_id)?.name||'onbekend')} / ${row.guild_id}): ${error.message}`);
                }
            });
        }
    }finally{busy=false;}
}
function status(guildId){return db().prepare('SELECT status,COUNT(*) count FROM discord_event_logs WHERE guild_id=? GROUP BY status').all(guildId);}
function retry(guildId){return db().prepare("UPDATE discord_event_logs SET status='pending',attempts=0,next_attempt=0 WHERE guild_id=? AND status='failed'").run(guildId).changes;}
function stop(){clearInterval(timer);timer=null;}
function start(client){
    if(timer)return;
    timer=setInterval(()=>drain(client).catch(e=>logger.warn(`Discordlog-wachtrij: ${e.message}`)),1000);timer.unref();
}
function messageDetails(m){
    const embeds = (m.embeds || []).map(e=>[e.title,e.description,...(e.fields||[]).map(f=>`${f.name}: ${f.value}`)].filter(Boolean).join('\n')).filter(Boolean).join('\n\n');
    return [{name:'Auteur',value:names.user(m.guild,m.member||m.author)},
        {name:'Kanaal',value:names.channel(m.guild,m.channel||m.channelId)},
        {name:'Bericht',value:names.messageLink(m)},
        {name:'Inhoud',value:m.content||(m.embeds?.length ? 'Geen losse berichttekst; zie embeds.' : 'Geen tekst beschikbaar (leeg bericht, ontbrekende cache of Message Content-intent).')},
        ...(m.embeds?.length ? [{name:'Embeds',value:embeds||'Embed zonder leesbare tekst'}] : []),
        {name:'Bijlagen',value:[...(m.attachments?.values?.()||[])].map(a=>`${a.name||'bestand'}: ${a.url||''}`).join('\n')||'Geen bekende bijlagen'}];
}
const LABELS = {
    channelId:'Spraakkanaal',selfMute:'Microfoon zelf gedempt',selfDeaf:'Geluid zelf uitgeschakeld',
    serverMute:'Microfoon door server gedempt',serverDeaf:'Geluid door server uitgeschakeld',
    streaming:'Scherm delen',selfVideo:'Camera',suppress:'Spreken onderdrukt',requestToSpeakTimestamp:'Spreekverzoek',
    nickname:'Bijnaam',pending:'Wacht op ledencontrole',premiumSinceTimestamp:'Booster sinds',communicationDisabledUntilTimestamp:'Time-out tot',
    name:'Naam',color:'Kleur',position:'Positie',hoist:'Apart weergegeven',mentionable:'Vermeldbaar',permissions:'Rechten',
    type:'Type',parentId:'Bovenliggend kanaal',topic:'Onderwerp',nsfw:'Leeftijdsbeperking',rateLimitPerUser:'Slowmode (seconden)',
    bitrate:'Bitrate',userLimit:'Gebruikerslimiet',archived:'Gearchiveerd',locked:'Vergrendeld',autoArchiveDuration:'Automatisch archiveren (minuten)',
    description:'Beschrijving',status:'Status',scheduledStartTimestamp:'Starttijd',scheduledEndTimestamp:'Eindtijd',
    animated:'Geanimeerd',tags:'Tags',privacyLevel:'Privacy',enabled:'Ingeschakeld',triggerType:'Triggertype',triggerMetadata:'Triggerinstellingen',
    actions:'Acties',volume:'Volume',emojiId:'Emoji-ID',emojiName:'Emojinaam',icon:'Pictogram',banner:'Banner',
    verificationLevel:'Verificatieniveau',explicitContentFilter:'Inhoudsfilter',defaultMessageNotifications:'Standaardmeldingen',
    afkChannelId:'AFK-kanaal',afkTimeout:'AFK-wachttijd',systemChannelId:'Systeemkanaal',rulesChannelId:'Regelkanaal',ownerId:'Servereigenaar',preferredLocale:'Voorkeurstaal',premiumTier:'Boostniveau'
};
function detail(key,value,entity,guild){
    if(['channelId','parentId','afkChannelId','systemChannelId','rulesChannelId'].includes(key)) {
        const object = key==='channelId' ? entity?.channel : key==='parentId' ? entity?.parent : null;
        return names.channel(guild,object?.id===value ? object : value);
    }
    if(key==='ownerId')return names.user(guild,value);
    if(key.endsWith('Timestamp'))return value && Number.isFinite(Number(value)) ? new Date(Number(value)).toISOString() : 'Niet ingesteld';
    if(key==='permissions' && value?.toArray)return value.toArray().join(', ')||'Geen';
    return plain(value);
}
function diff(a,b,keys){
    const guild=b?.guild||a?.guild;
    return keys.filter(k=>plain(a?.[k])!==plain(b?.[k])).map(k=>({name:tr(LABELS[k]||k),value:tr("Voor: {0}\nNa: {1}",detail(k,a?.[k],a,guild),detail(k,b?.[k],b,guild))}));
}
function roleIds(m){return [...(m?.roles?.cache?.keys?.()||[])].sort().join(', ');}
function roleNames(m){return [...(m?.roles?.cache?.values?.()||[])].map(role=>names.role(m.guild,role)).join('\n')||'Geen';}
function overwrites(ch){return [...(ch?.permissionOverwrites?.cache?.values?.()||[])].map(o=>({id:o.id,type:o.type,allow:String(o.allow.bitfield),deny:String(o.deny.bitfield)})).sort((a,b)=>a.id.localeCompare(b.id));}
function overwriteNames(ch){
    return [...(ch?.permissionOverwrites?.cache?.values?.()||[])].map(o=>{
        const target=o.type===0 ? names.role(ch.guild,o.id) : names.user(ch.guild,o.id);
        return `${target}\nToestaan: ${o.allow.toArray?.().join(', ')||String(o.allow.bitfield)}\nWeigeren: ${o.deny.toArray?.().join(', ')||String(o.deny.bitfield)}`;
    }).join('\n\n')||'Geen';
}
function auditValue(key,value,guild){
    if(['$add','$remove'].includes(key)&&Array.isArray(value))return value.map(role=>names.role(guild,role)).join('\n')||'Geen';
    const channelKeys=['channel_id','parent_id','afk_channel_id','system_channel_id','rules_channel_id'];
    if(channelKeys.includes(key))return names.channel(guild,value);
    if(key==='owner_id')return names.user(guild,value);
    return plain(value);
}
function install(client){
    if(installed.has(client))return;installed.add(client);
    function on(name,fn){client.on(name,(...args)=>{try{Promise.resolve(fn(...args)).catch(e=>logger.warn(`Discordlog ${name}: ${e.message}`));}catch(e){logger.warn(`Discordlog ${name}: ${e.message}`);}});}
    const message=(m)=>m?.guild&&m.author?.id!==client.user?.id;
    on(Events.MessageCreate,m=>{if(message(m))enqueue(m.guild,'Messages','Bericht geplaatst',m.url||'',messageDetails(m));});
    on(Events.MessageDelete,m=>{if(message(m))enqueue(m.guild,'MessageDeletes','Bericht verwijderd','Auteur is niet noodzakelijk degene die het bericht verwijderde.',messageDetails(m));});
    on(Events.MessageUpdate,(a,b)=>{if(message(b)&&(a.content!==b.content||a.attachments?.size!==b.attachments?.size))enqueue(b.guild,'MessageEdits','Bericht gewijzigd',b.url||'',[{name:'Auteur',value:names.user(b.guild,b.member||b.author||a.author)},{name:'Kanaal',value:names.channel(b.guild,b.channel||a.channel||b.channelId)},{name:'Bericht',value:names.messageLink(b)},{name:'Voor',value:a.content||'Vorige inhoud niet beschikbaar'},{name:'Na',value:b.content||'Nieuwe inhoud niet beschikbaar of leeg'}]);});
    on(Events.MessageBulkDelete,(messages,ch)=>enqueue(ch.guild,'MessageDeletes','Berichten in bulk verwijderd',`${messages.size} berichten in ${names.channel(ch.guild,ch)}.`,[{name:'Bericht-ID’s (eerste 50)',value:[...messages.keys()].slice(0,50).join(', ')||'onbekend'}]));
    for(const [event,label] of [[Events.MessageReactionAdd,'Reactie toegevoegd'],[Events.MessageReactionRemove,'Reactie verwijderd']])on(event,(reaction,user)=>{if(reaction.message?.guild&&user?.id!==client.user?.id)enqueue(reaction.message.guild,'Reactions',label,`${names.user(reaction.message.guild,user)} — ${reaction.emoji?.name||reaction.emoji?.id}\n${names.channel(reaction.message.guild,reaction.message.channel||reaction.message.channelId)}\n${names.messageLink(reaction.message)}`);});
    on(Events.MessageReactionRemoveAll,m=>{if(m.guild)enqueue(m.guild,'Reactions','Alle reacties verwijderd',`${names.channel(m.guild,m.channel||m.channelId)}\n${names.messageLink(m)}`);});
    on(Events.MessageReactionRemoveEmoji,r=>{if(r.message.guild)enqueue(r.message.guild,'Reactions','Emoji-reacties verwijderd',`${names.channel(r.message.guild,r.message.channel||r.message.channelId)}\n${names.messageLink(r.message)}; emoji ${r.emoji?.name||r.emoji?.id}`);});
    on(Events.GuildMemberAdd,m=>enqueue(m.guild,'Members','Lid toegetreden',names.user(m.guild,m),[{name:'Account aangemaakt',value:m.user.createdAt?.toISOString()||'onbekend'}]));
    on(Events.GuildMemberRemove,m=>enqueue(m.guild,'Members','Lid vertrokken',names.user(m.guild,m)+'\nReden/uitvoerder: zie auditlog indien beschikbaar.'));
    on(Events.GuildMemberUpdate,(a,b)=>{
        const changes=diff(a,b,['nickname','pending','premiumSinceTimestamp','communicationDisabledUntilTimestamp']);
        if(changes.length)enqueue(b.guild,'Members','Lid gewijzigd',names.user(b.guild,b.user),changes);
        if(a.communicationDisabledUntilTimestamp!==b.communicationDisabledUntilTimestamp)enqueue(b.guild,'Moderation','Time-out gewijzigd',names.user(b.guild,b.user),diff(a,b,['communicationDisabledUntilTimestamp']));
        if(roleIds(a)!==roleIds(b))enqueue(b.guild,'Roles','Lidrollen gewijzigd',names.user(b.guild,b.user),[{name:'Voor',value:roleNames(a)},{name:'Na',value:roleNames(b)}]);
    });
    for(const [event,label] of [[Events.GuildBanAdd,'Lid verbannen'],[Events.GuildBanRemove,'Ban opgeheven']])on(event,b=>enqueue(b.guild,'Moderation',label,names.user(b.guild,b.user),[{name:'Reden',value:b.reason||'Niet meegeleverd; zie auditlog'}]));
    const specs=[['GuildRole','Roles',['name','color','position','hoist','mentionable','permissions']],['Channel','Channels',['name','type','parentId','topic','nsfw','rateLimitPerUser','bitrate','userLimit','position']],['Thread','Threads',['name','archived','locked','parentId','autoArchiveDuration','rateLimitPerUser']],['GuildScheduledEvent','ScheduledEvents',['name','description','status','channelId','scheduledStartTimestamp','scheduledEndTimestamp']],['GuildEmoji','Expressions',['name','animated']],['GuildSticker','Expressions',['name','description','tags']],['StageInstance','Voice',['topic','privacyLevel','channelId']],['AutoModerationRule','AutoMod',['name','enabled','triggerType','triggerMetadata','actions']],['GuildSoundboardSound','Expressions',['name','volume','emojiId','emojiName']]];
    for(const [kind,category,keys] of specs){
        for(const action of ['Create','Delete','Update']){
            const event=Events[kind+action];if(!event)continue;
            on(event,(a,b)=>{
                if(kind==='Thread'&&action==='Create'&&b===false)return; // Existing thread becoming visible is not a creation.
                const entity=action==='Update'?b:a;if(!entity?.guild)return;
                let changes=action==='Update'?diff(a,b,keys):keys.filter(k=>entity[k]!=null).map(k=>({name:tr(LABELS[k]||k),value:detail(k,entity[k],entity,entity.guild)}));
                if(kind==='Channel'&&action==='Update'&&plain(overwrites(a))!==plain(overwrites(b)))changes.push({name:'Kanaalrechten',value:`Voor: ${overwriteNames(a)}\nNa: ${overwriteNames(b)}`});
                if(action==='Update'&&!changes.length)return;
                enqueue(entity.guild,category,`${kind}: ${{Create:'aangemaakt',Delete:'verwijderd',Update:'gewijzigd'}[action]}`,`${entity.name||entity.topic||kind} (${entity.id})`,changes);
            });
        }
    }
    on(Events.ThreadMembersUpdate,(added,removed,thread)=>enqueue(thread.guild,'Threads','Threadleden gewijzigd',names.channel(thread.guild,thread),[{name:'Toegevoegd',value:[...added.keys()].map(id=>names.user(thread.guild,id)).join('\n')||'Geen'},{name:'Verwijderd',value:[...removed.keys()].map(id=>names.user(thread.guild,id)).join('\n')||'Geen'}]));
    on(Events.ChannelPinsUpdate,(ch,date)=>enqueue(ch.guild,'Channels','Vastgezette berichten gewijzigd',`${names.channel(ch.guild,ch)}; laatste pin ${date?.toISOString()||'onbekend'}`));
    on(Events.VoiceStateUpdate,(a,b)=>{
        const changes=diff(a,b,['channelId','selfMute','selfDeaf','serverMute','serverDeaf','streaming','selfVideo','suppress','requestToSpeakTimestamp']);
        const title=a.channelId!==b.channelId ? (!b.channelId ? 'Spraakkanaal verlaten' : !a.channelId ? 'Spraakkanaal betreden' : 'Verplaatst naar ander spraakkanaal') : 'Voice-status gewijzigd';
        if(changes.length)enqueue(b.guild,'Voice',title,names.user(b.guild,b.member||a.member||b.id),changes);
    });
    for(const [event,label]of [[Events.InviteCreate,'Uitnodiging aangemaakt'],[Events.InviteDelete,'Uitnodiging verwijderd']])on(event,i=>enqueue(i.guild,'Invites',label,`Code: ${i.code}\nKanaal: ${names.channel(i.guild,i.channel||i.channelId)}\nMaker: ${names.user(i.guild,i.inviter)}`));
    on(Events.GuildUpdate,(a,b)=>{const changes=diff(a,b,['name','description','icon','banner','verificationLevel','explicitContentFilter','defaultMessageNotifications','afkChannelId','afkTimeout','systemChannelId','rulesChannelId','ownerId','preferredLocale','premiumTier']);if(changes.length)enqueue(b,'Server','Server gewijzigd',`${names.clean(b.name)} · ID: ${b.id}`,changes);});
    on(Events.WebhooksUpdate,ch=>enqueue(ch.guild,'Integrations','Webhooks gewijzigd',`${names.channel(ch.guild,ch)}. Details/uitvoerder indien beschikbaar in auditlog; geen webhooktokens opgeslagen.`));
    on(Events.GuildIntegrationsUpdate,g=>enqueue(g,'Integrations','Integraties gewijzigd',`${names.clean(g.name)} · ID: ${g.id}`));
    for(const [event,label]of [[Events.GuildScheduledEventUserAdd,'Deelname evenement toegevoegd'],[Events.GuildScheduledEventUserRemove,'Deelname evenement verwijderd']])on(event,(e,u)=>enqueue(e.guild,'ScheduledEvents',label,`${e.name} (${e.id})\n${names.user(e.guild,u)}`));
    on(Events.AutoModerationActionExecution,e=>enqueue(e.guild,'AutoMod','Discord AutoMod-actie',`${names.user(e.guild,e.userId)}\n${names.channel(e.guild,e.channelId)}\nRegel: ${names.target(e.guild,e.guild.autoModerationRules?.cache?.get(e.ruleId)||e.ruleId)}`,[{name:'Actie',value:plain(e.action)},{name:'Inhoud indien beschikbaar',value:e.content||'Niet meegeleverd'}]));
    on(Events.GuildAuditLogEntryCreate,(e,g)=>enqueue(g,'Audit','Discord-auditlog',`${AuditLogEvent[e.action]||e.action}\nUitvoerder: ${names.user(g,e.executor||e.executorId)}\nDoel: ${names.target(g,e.target||e.targetId,e.targetType)}\nAudit-ID: ${e.id}`,[{name:'Reden',value:e.reason||'Niet opgegeven'},...(e.changes||[]).filter(c=>!/token|secret|password|authorization|webhook_url/i.test(c.key)).map(c=>({name:LABELS[c.key]||({'$add':'Rollen toegevoegd','$remove':'Rollen verwijderd',channel_id:'Kanaal',parent_id:'Bovenliggend kanaal',owner_id:'Servereigenaar'}[c.key])||c.key,value:`Voor: ${auditValue(c.key,c.old,g)}\nNa: ${auditValue(c.key,c.new,g)}`}))]));
    on(Events.GuildAuditLogEntryCreate,(e,g)=>{
        if([AuditLogEvent.MemberKick,AuditLogEvent.MemberPrune,AuditLogEvent.MemberMove,AuditLogEvent.MemberDisconnect].includes(e.action))
            enqueue(g,'Moderation',AuditLogEvent[e.action],`Uitvoerder ${names.user(g,e.executor||e.executorId)}; doel ${names.target(g,e.target||e.targetId,e.targetType)}; audit ${e.id}`,[{name:'Reden',value:e.reason||'Niet opgegeven'}]);
    });
    on(Events.PresenceUpdate,(a,b)=>{if(a?.status!==b.status)enqueue(b.guild,'Presence','Online-status gewijzigd',`${names.user(b.guild,b.user||b.userId)}\n${a?.status||'onbekend'} → ${b.status}`);});
    on(Events.TypingStart,t=>{if(t.user?.id!==client.user?.id)enqueue(t.guild,'Typing','Begonnen met typen',`${names.user(t.guild,t.user)}\n${names.channel(t.guild,t.channel)}`);});
    for(const [event,label]of [[Events.MessagePollVoteAdd,'Pollstem toegevoegd'],[Events.MessagePollVoteRemove,'Pollstem verwijderd']])on(event,(answer,userId)=>enqueue(answer.poll?.message?.guild,'Polls',label,`${names.user(answer.poll?.message?.guild,userId)}\n${names.messageLink(answer.poll?.message)}\nAntwoord: ${answer.text||answer.id}`));
}
module.exports={CATEGORIES,enqueue,drain,status,retry,route,enabled,install,start,stop,envelope};
