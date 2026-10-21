'use strict';
const settings=require('../database/guildSettings');
const data=require('../database/honeypot');
const {tr}=require('../utils/localization');
const logger=require('../utils/logger');
const locks=new Map();
let timer;
const INACTIVE='# ℹ️ HONEYPOT UITGESCHAKELD / HONEYPOT DISABLED\n\nDe automatische honeypot-beveiliging is niet meer actief in dit kanaal.\nAutomatic honeypot protection is no longer active in this channel.';
function warningText(action,mention='') {
    const ban=action==='ban';
    return `# 🚨 WAARSCHUWING / WARNING 🚨

🇳🇱 **Nederlands**

⚠️ **LET OP! TYP NIET IN DIT KANAAL!**

Berichten die in dit kanaal worden geplaatst, worden automatisch gedetecteerd door ons beveiligingssysteem.

🔴 **Iedereen die in dit kanaal een bericht plaatst, ontvangt direct ${ban?'een permanente ban (INSTANT BAN)':'een time-out van 7 dagen (INSTANT TIME-OUT)'}.**

🛡️ Dit kanaal is uitsluitend bedoeld om spam-bots automatisch te detecteren en ${ban?'permanent van onze Discord-server te verwijderen':'7 dagen te blokkeren op onze Discord-server'}.

⛔ **Gebruik dit kanaal dus NIET!**

---

🇬🇧 **English**

⚠️ **WARNING! DO NOT TYPE IN THIS CHANNEL!**

Any messages posted in this channel will be automatically detected by our security system.

🔴 **Anyone who sends a message in this channel will receive an immediate ${ban?'permanent ban (INSTANT BAN)':'7-day timeout (INSTANT TIMEOUT)'}.**

🛡️ This channel is exclusively designed to automatically detect spam bots and ${ban?'permanently remove them from our Discord server':'block them on our Discord server for 7 days'}.

⛔ **DO NOT use this channel under any circumstances!**${mention?'\n\n---\n\n🔔 '+mention:''}`;
}
async function mentionChoice(guild,cfg) {
    const choice=cfg.Honeypot.Mention;
    if(!choice || choice==='none')return {text:'',allowed:{parse:[]}};
    if(choice==='everyone'||choice==='here')return {text:'@'+choice,allowed:{parse:['everyone']}};
    const id=choice==='verified'?cfg.Roles.Verified:choice;
    if(!id)return {text:'',allowed:{parse:[]}};
    const role=await guild.roles.fetch(id);
    if(!role || role.id===guild.id)throw Error('De ingestelde mentionrol bestaat niet; kies een rol of everyone.');
    return {text:`<@&${id}>`,allowed:{parse:[],roles:[id]}};
}
async function fetchMessage(channel,id) {
    return channel.messages.fetch(id).catch(error=>{if(Number(error.code)===10008)return null;throw error;});
}
async function sync(guild) {
    const cfg=settings.getGuildConfig(guild.id),h=cfg.Honeypot;
    const active=h.Enabled&&h.Channel;
    const rows=data.warnings(guild.id);
    // Mark previous channels inactive when the channel changes or detection is disabled.
    let cleanupError;
    for(const row of rows) {
        if(active&&row.channel_id===h.Channel)continue;
        if(row.content===INACTIVE)continue;
        try {
            const old=await guild.channels.fetch(row.channel_id).catch(error=>{if(Number(error.code)===10003)return null;throw error;});
            const msg=old?await fetchMessage(old,row.message_id):null;
            if(msg&&msg.author.id===guild.client.user.id)await msg.edit({content:INACTIVE,allowedMentions:{parse:[]}});
            data.warning(guild.id,row.channel_id,row.message_id,INACTIVE);
        } catch(error) {cleanupError=error;}
    }
    if(active) {
        const channel=await guild.channels.fetch(h.Channel);
        if(!channel?.isTextBased() || !channel.messages || typeof channel.send!=='function')throw Error('Kies een bereikbaar tekstkanaal voor Honeypot.Channel.');
        const mention=await mentionChoice(guild,cfg);
        const content=warningText(h.Action,mention.text);
        const saved=rows.find(row=>row.channel_id===h.Channel);
        const existing=saved?await fetchMessage(channel,saved.message_id):null;
        if(existing) {
            if(existing.author.id!==guild.client.user.id)throw Error('Het opgeslagen waarschuwingsbericht is niet van deze bot.');
            if(existing.content!==content)await existing.edit({content,allowedMentions:{parse:[]}});
            data.warning(guild.id,channel.id,existing.id,content);
        } else {
            // Initial publication may ping the selected audience. Repairs never ping again.
            const posted=await channel.send({content,allowedMentions:saved?{parse:[]}:mention.allowed});
            data.warning(guild.id,channel.id,posted.id,content);
        }
    }
    if(cleanupError)throw cleanupError;
}
async function syncWarning(guild) {
    const task=(locks.get(guild.id)||Promise.resolve()).catch(()=>{}).then(()=>sync(guild));
    locks.set(guild.id,task);
    try {await task;return '';}
    catch(error){logger.warn(`Honeypot waarschuwing [${guild.id}]: ${error.message}`);return tr('\n⚠️ Configuratie opgeslagen, maar de kanaalwaarschuwing kon niet volledig worden bijgewerkt. Controleer kanaal, mentionrol en botrechten.');}
    finally{if(locks.get(guild.id)===task)locks.delete(guild.id);}
}
async function tick(client){for(const guild of client.guilds.cache.values())await syncWarning(guild);}
function start(client){
    if(timer)return;
    let running=false;
    const run=async()=>{if(running)return;running=true;try{await tick(client);}catch(error){logger.warn(`Honeypot waarschuwing: ${error.message}`);}finally{running=false;}};
    timer=setInterval(run,60000);timer.unref();void run();
}
module.exports={warningText,mentionChoice,syncWarning,tick,start,INACTIVE};
