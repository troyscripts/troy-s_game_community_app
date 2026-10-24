'use strict';
const { PermissionFlagsBits: P, AuditLogEvent, Events } = require('discord.js');
const config = require('../config/config');
const logger = require('../utils/logger');
const { sendLogMessage } = require('../utils/localization');
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
const who=v=>`${v?.tag||v?.username||v?.displayName||'Gebruiker'} (${idOf(v)})`;
function plain(v){
    if(v===undefined||v===null)return 'onbekend';
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
                    if(attempts===1||attempts===5)logger.warn(`Discordlog ${row.id} (${row.category}, server ${row.guild_id}): ${error.message}`);
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
    return [{name:'Auteur',value:who(m.author)}, {name:'Kanaal / bericht',value:`${m.channelId||m.channel?.id} / ${m.id}`},
        {name:'Inhoud',value:m.content||'Inhoud niet beschikbaar of geen tekst (cache/Message Content-intent).'},
        {name:'Bijlagen',value:[...(m.attachments?.values?.()||[])].map(a=>`${a.name||'bestand'}: ${a.url||''}`).join('\n')||'Geen bekende bijlagen'}];
}
function diff(a,b,keys){
    return keys.filter(k=>plain(a?.[k])!==plain(b?.[k])).map(k=>({name:k,value:`Voor: ${plain(a?.[k])}\nNa: ${plain(b?.[k])}`}));
}
function roleIds(m){return [...(m?.roles?.cache?.keys?.()||[])].sort().join(', ');}
function overwrites(ch){return [...(ch?.permissionOverwrites?.cache?.values?.()||[])].map(o=>({id:o.id,type:o.type,allow:String(o.allow.bitfield),deny:String(o.deny.bitfield)})).sort((a,b)=>a.id.localeCompare(b.id));}
function install(client){
    if(installed.has(client))return;installed.add(client);
    function on(name,fn){client.on(name,(...args)=>{try{Promise.resolve(fn(...args)).catch(e=>logger.warn(`Discordlog ${name}: ${e.message}`));}catch(e){logger.warn(`Discordlog ${name}: ${e.message}`);}});}
    const message=(m)=>m?.guild&&m.author?.id!==client.user?.id;
    on(Events.MessageCreate,m=>{if(message(m))enqueue(m.guild,'Messages','Bericht geplaatst',m.url||'',messageDetails(m));});
    on(Events.MessageDelete,m=>{if(message(m))enqueue(m.guild,'MessageDeletes','Bericht verwijderd','Auteur is niet noodzakelijk degene die het bericht verwijderde.',messageDetails(m));});
    on(Events.MessageUpdate,(a,b)=>{if(message(b)&&(a.content!==b.content||a.attachments?.size!==b.attachments?.size))enqueue(b.guild,'MessageEdits','Bericht gewijzigd',b.url||'',[{name:'Auteur',value:who(b.author||a.author)},{name:'Kanaal / bericht',value:`${b.channelId} / ${b.id}`},{name:'Voor',value:a.content||'Vorige inhoud niet beschikbaar'},{name:'Na',value:b.content||'Nieuwe inhoud niet beschikbaar of leeg'}]);});
    on(Events.MessageBulkDelete,(messages,ch)=>enqueue(ch.guild,'MessageDeletes','Berichten in bulk verwijderd',`${messages.size} berichten in kanaal ${ch.id}.`,[{name:'Bericht-ID’s (eerste 50)',value:[...messages.keys()].slice(0,50).join(', ')||'onbekend'}]));
    for(const [event,label] of [[Events.MessageReactionAdd,'Reactie toegevoegd'],[Events.MessageReactionRemove,'Reactie verwijderd']])on(event,(reaction,user)=>{if(reaction.message?.guild&&user?.id!==client.user?.id)enqueue(reaction.message.guild,'Reactions',label,`${who(user)} — ${reaction.emoji?.name||reaction.emoji?.id}\nKanaal ${reaction.message.channelId}; bericht ${reaction.message.id}`);});
    on(Events.MessageReactionRemoveAll,m=>{if(m.guild)enqueue(m.guild,'Reactions','Alle reacties verwijderd',`Kanaal ${m.channelId}; bericht ${m.id}`);});
    on(Events.MessageReactionRemoveEmoji,r=>{if(r.message.guild)enqueue(r.message.guild,'Reactions','Emoji-reacties verwijderd',`Bericht ${r.message.id}; emoji ${r.emoji?.name||r.emoji?.id}`);});
    on(Events.GuildMemberAdd,m=>enqueue(m.guild,'Members','Lid toegetreden',who(m.user),[{name:'Account aangemaakt',value:m.user.createdAt?.toISOString()||'onbekend'}]));
    on(Events.GuildMemberRemove,m=>enqueue(m.guild,'Members','Lid vertrokken',who(m.user)+'\nReden/uitvoerder: zie auditlog indien beschikbaar.'));
    on(Events.GuildMemberUpdate,(a,b)=>{
        const changes=diff(a,b,['nickname','pending','premiumSinceTimestamp','communicationDisabledUntilTimestamp']);
        if(changes.length)enqueue(b.guild,'Members','Lid gewijzigd',who(b.user),changes);
        if(a.communicationDisabledUntilTimestamp!==b.communicationDisabledUntilTimestamp)enqueue(b.guild,'Moderation','Time-out gewijzigd',who(b.user),diff(a,b,['communicationDisabledUntilTimestamp']));
        if(roleIds(a)!==roleIds(b))enqueue(b.guild,'Roles','Lidrollen gewijzigd',who(b.user),[{name:'Voor',value:roleIds(a)||'Geen'},{name:'Na',value:roleIds(b)||'Geen'}]);
    });
    for(const [event,label] of [[Events.GuildBanAdd,'Lid verbannen'],[Events.GuildBanRemove,'Ban opgeheven']])on(event,b=>enqueue(b.guild,'Moderation',label,who(b.user),[{name:'Reden',value:b.reason||'Niet meegeleverd; zie auditlog'}]));
    const specs=[['GuildRole','Roles',['name','color','position','hoist','mentionable','permissions']],['Channel','Channels',['name','type','parentId','topic','nsfw','rateLimitPerUser','bitrate','userLimit','position']],['Thread','Threads',['name','archived','locked','parentId','autoArchiveDuration','rateLimitPerUser']],['GuildScheduledEvent','ScheduledEvents',['name','description','status','channelId','scheduledStartTimestamp','scheduledEndTimestamp']],['GuildEmoji','Expressions',['name','animated']],['GuildSticker','Expressions',['name','description','tags']],['StageInstance','Voice',['topic','privacyLevel','channelId']],['AutoModerationRule','AutoMod',['name','enabled','triggerType','triggerMetadata','actions']],['GuildSoundboardSound','Expressions',['name','volume','emojiId','emojiName']]];
    for(const [kind,category,keys] of specs){
        for(const action of ['Create','Delete','Update']){
            const event=Events[kind+action];if(!event)continue;
            on(event,(a,b)=>{
                if(kind==='Thread'&&action==='Create'&&b===false)return; // Existing thread becoming visible is not a creation.
                const entity=action==='Update'?b:a;if(!entity?.guild)return;
                let changes=action==='Update'?diff(a,b,keys):keys.filter(k=>entity[k]!=null).map(k=>({name:k,value:plain(entity[k])}));
                if(kind==='Channel'&&action==='Update'&&plain(overwrites(a))!==plain(overwrites(b)))changes.push({name:'Kanaalrechten',value:`Voor: ${plain(overwrites(a))}\nNa: ${plain(overwrites(b))}`});
                if(action==='Update'&&!changes.length)return;
                enqueue(entity.guild,category,`${kind}: ${{Create:'aangemaakt',Delete:'verwijderd',Update:'gewijzigd'}[action]}`,`${entity.name||entity.topic||kind} (${entity.id})`,changes);
            });
        }
    }
    on(Events.ThreadMembersUpdate,(added,removed,thread)=>enqueue(thread.guild,'Threads','Threadleden gewijzigd',`Thread ${thread.id}`,[{name:'Toegevoegd',value:[...added.keys()].join(', ')||'Geen'},{name:'Verwijderd',value:[...removed.keys()].join(', ')||'Geen'}]));
    on(Events.ChannelPinsUpdate,(ch,date)=>enqueue(ch.guild,'Channels','Vastgezette berichten gewijzigd',`Kanaal ${ch.id}; laatste pin ${date?.toISOString()||'onbekend'}`));
    on(Events.VoiceStateUpdate,(a,b)=>{
        const changes=diff(a,b,['channelId','selfMute','selfDeaf','serverMute','serverDeaf','streaming','selfVideo','suppress','requestToSpeakTimestamp']);
        if(changes.length)enqueue(b.guild,'Voice','Voice-status gewijzigd',who(b.member?.user||{id:b.id}),changes);
    });
    for(const [event,label]of [[Events.InviteCreate,'Uitnodiging aangemaakt'],[Events.InviteDelete,'Uitnodiging verwijderd']])on(event,i=>enqueue(i.guild,'Invites',label,`Code: ${i.code}\nKanaal: ${i.channelId||i.channel?.id}\nMaker: ${who(i.inviter)}`));
    on(Events.GuildUpdate,(a,b)=>{const changes=diff(a,b,['name','description','icon','banner','verificationLevel','explicitContentFilter','defaultMessageNotifications','afkChannelId','afkTimeout','systemChannelId','rulesChannelId','ownerId','preferredLocale','premiumTier']);if(changes.length)enqueue(b,'Server','Server gewijzigd',b.id,changes);});
    on(Events.WebhooksUpdate,ch=>enqueue(ch.guild,'Integrations','Webhooks gewijzigd',`Kanaal ${ch.id}. Details/uitvoerder indien beschikbaar in auditlog; geen webhooktokens opgeslagen.`));
    on(Events.GuildIntegrationsUpdate,g=>enqueue(g,'Integrations','Integraties gewijzigd',g.id));
    for(const [event,label]of [[Events.GuildScheduledEventUserAdd,'Deelname evenement toegevoegd'],[Events.GuildScheduledEventUserRemove,'Deelname evenement verwijderd']])on(event,(e,u)=>enqueue(e.guild,'ScheduledEvents',label,`${e.name} (${e.id})\n${who(u)}`));
    on(Events.AutoModerationActionExecution,e=>enqueue(e.guild,'AutoMod','Discord AutoMod-actie',`Gebruiker ${e.userId}; kanaal ${e.channelId}; regel ${e.ruleId}`,[{name:'Actie',value:plain(e.action)},{name:'Inhoud indien beschikbaar',value:e.content||'Niet meegeleverd'}]));
    on(Events.GuildAuditLogEntryCreate,(e,g)=>enqueue(g,'Audit','Discord-auditlog',`${AuditLogEvent[e.action]||e.action}\nUitvoerder: ${e.executorId||e.executor?.id||'onbekend'}\nDoel: ${e.targetId||e.target?.id||'onbekend'}\nAudit-ID: ${e.id}`,[{name:'Reden',value:e.reason||'Niet opgegeven'},...(e.changes||[]).filter(c=>!/token|secret|password|authorization|webhook_url/i.test(c.key)).map(c=>({name:c.key,value:`Voor: ${plain(c.old)}\nNa: ${plain(c.new)}`}))]));
    on(Events.GuildAuditLogEntryCreate,(e,g)=>{
        if([AuditLogEvent.MemberKick,AuditLogEvent.MemberPrune,AuditLogEvent.MemberMove,AuditLogEvent.MemberDisconnect].includes(e.action))
            enqueue(g,'Moderation',AuditLogEvent[e.action],`Uitvoerder ${e.executorId||'onbekend'}; doel ${e.targetId||'onbekend'}; audit ${e.id}`,[{name:'Reden',value:e.reason||'Niet opgegeven'}]);
    });
    on(Events.PresenceUpdate,(a,b)=>{if(a?.status!==b.status)enqueue(b.guild,'Presence','Online-status gewijzigd',`Gebruiker ${b.userId}\n${a?.status||'onbekend'} → ${b.status}`);});
    on(Events.TypingStart,t=>{if(t.user?.id!==client.user?.id)enqueue(t.guild,'Typing','Begonnen met typen',`${who(t.user)}\nKanaal ${t.channel?.id}`);});
    for(const [event,label]of [[Events.MessagePollVoteAdd,'Pollstem toegevoegd'],[Events.MessagePollVoteRemove,'Pollstem verwijderd']])on(event,(answer,userId)=>enqueue(answer.poll?.message?.guild,'Polls',label,`Gebruiker ${userId}; bericht ${answer.poll?.message?.id}; antwoord ${answer.id}`));
}
module.exports={CATEGORIES,enqueue,drain,status,retry,route,enabled,install,start,stop,envelope};
