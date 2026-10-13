const { tr, send } = require("../utils/localization");
const { MessageFlags, PermissionFlagsBits: P } = require('discord.js');
const { randomBytes } = require('node:crypto');
const store = require('../database/store');
const economy = require('../database/economy');
const credits = require('../database/storeCredits');
const invoices = require('../database/economyActions');
const settings = require('../database/guildSettings');
const config = require('../config/config');
const logger = require('../utils/logger');
const locks=new Map();
let timer;
const money=n=>`€${Number(n).toLocaleString('nl-NL')}`;
function locked(guild,user,fn) {
    const key=`${guild}:${user}`,task=(locks.get(key)||Promise.resolve()).catch(()=>{}).then(fn);
    locks.set(key,task);
    return task.finally(()=>{if(locks.get(key)===task)locks.delete(key);});
}
function fail(message){const e=new Error(message);e.storeInput=true;throw e;}
async function guarded(i,fn) {
    await i.deferReply({flags:MessageFlags.Ephemeral});
    try{return await locked(i.guildId,i.user.id,fn);}
    catch(e){
        if(!e.storeInput)logger.warn(`Store [${i.guildId}/${i.user.id}]: ${e.message}`);
        return send(i, "editReply", {content:e.storeInput?e.message:tr("De winkel kon deze actie nog niet afronden. Kijk bij /store actie:status; een opgeslagen aankoop wordt automatisch verder verwerkt."),allowedMentions:{parse:[]}});
    }
}
async function checkRole(guild,id) {
    if(!id)fail(tr("De winkel is nog niet ingesteld. Laat een beheerder Store.VIPRole instellen via /config."));
    const role=await guild.roles.fetch(id);
    if(!role)fail(tr("De ingestelde VIP-rol bestaat niet meer."));
    const cfg=settings.getGuildConfig(guild.id);
    const reserved=[...Object.values(cfg.Roles||{}),...(cfg.StaffRoles||[]),cfg.Birthday?.Role,cfg.Welcome?.AutoRole];
    const unsafe=[P.Administrator,P.ManageGuild,P.ManageRoles,P.ManageChannels,P.KickMembers,P.BanMembers,P.ModerateMembers,P.ManageMessages,P.ManageWebhooks];
    if(role.id===guild.id||role.managed||reserved.includes(id)||unsafe.some(bit=>role.permissions.has(bit)))fail(tr("Gebruik een aparte VIP-rol zonder staff- of beheerrechten, niet een automatische leden- of verjaardagsrol."));
    const me=await guild.members.fetchMe();
    if(!me.permissions.has(P.ManageRoles)||me.roles.highest.comparePositionTo(role)<=0)fail(tr("De bot heeft Rollen beheren nodig en zijn hoogste rol moet boven de VIP-rol staan."));
    return role;
}
async function member(guild,user){return guild.members.fetch({user,force:true});}
async function cleanExpired(guild,user,m) {
    for(const v of store.memberships(guild.id,user)){
        if(v.expires_at>Date.now())continue;
        const role=await guild.roles.fetch(v.role_id);
        if(role&&m?.roles.cache.has(v.role_id))await m.roles.remove(v.role_id,"Gekochte VIP-tijd afgelopen");
        store.expire(guild.id,user,v.role_id);
    }
}
async function deliver(guild,o) {
    if(o.status!=='pending')return o;
    let m;
    try{m=await member(guild,o.user_id);}catch(e){if(Number(e.code)===10007)return store.refund(o.id,tr("Lid is niet meer in deze server."));throw e;}
    try{
        await checkRole(guild,o.role_id);
        if(!m.roles.cache.has(o.role_id))await m.roles.add(o.role_id,"VIP gekocht in de economywinkel");
        return store.complete(o.id);
    }catch(e){
        // Confirm the actual role state after an API error before refunding.
        // A timed-out request may already have granted the role.
        const current=await member(guild,o.user_id);
        if(current.roles.cache.has(o.role_id)){
            if(e.storeInput)throw e; // Configuration changed: preserve the order for staff review/retry.
            return store.complete(o.id);
        }
        if(e.storeInput||[10011,50013,50001].includes(Number(e.code)))return store.refund(o.id,e.message);
        throw e;
    }
}
function receipt(o){
    if(o.status==='complete')return tr("✅ **VIP-aankoop geslaagd!**\n{0} dag(en) voor **{1}**, betaald uit je {2}.\nVIP geldig tot <t:{3}:f> (<t:{4}:R>).", o.days, money(o.price), o.source==='bank'?tr("bankrekening"):tr("portemonnee"), Math.floor(o.expires_at/1000), Math.floor(o.expires_at/1000));
    if(o.status==='refunded')return tr("De VIP-aankoop kon niet worden geleverd. **{0} is teruggestort** op je {1}.\n{2}", money(o.price), o.source==='bank'?tr("bankrekening"):tr("portemonnee"), o.note||'');
    return tr("⏳ Je betaling is opgeslagen. De roltoekenning wordt opnieuw geprobeerd; er wordt niet nogmaals afgeschreven. Bekijk /store actie:status.");
}
async function buy(i,days,source,nonce){
    const previous=store.get(nonce);
    if(previous){if(previous.guild_id!==i.guildId||previous.user_id!==i.user.id)fail(tr("Deze bevestiging is niet van jou."));return send(i, "editReply", {content:receipt(previous),allowedMentions:{parse:[]}});}
    const cfg=settings.getGuildConfig(i.guildId);
    if(!cfg.Economy.Enabled)fail(tr("De economie staat uit in deze server."));
    const role=await checkRole(i.guild,cfg.Store?.VIPRole);
    let m=await member(i.guild,i.user.id);
    if(m.user.bot)fail(tr("Bots kunnen geen VIP kopen."));
    if(store.pending(i.guildId,i.user.id))fail(tr("Een eerdere aankoop wordt nog verwerkt. Bekijk /store actie:status."));
    await cleanExpired(i.guild,i.user.id,m);
    m=await member(i.guild,i.user.id);
    const active=store.memberships(i.guildId,i.user.id).filter(v=>v.expires_at>Date.now());
    if(active.some(v=>v.role_id!==role.id))fail(tr("Je hebt nog VIP op een eerder ingestelde winkelrol. Wacht tot die afloopt voordat je een nieuwe rol koopt."));
    if(m.roles.cache.has(role.id)&&!active.some(v=>v.role_id===role.id))fail(tr("Je hebt deze VIP-rol al buiten de winkel gekregen. De winkel neemt die bestaande rol niet over."));
    // Settings may have changed while Discord data was being fetched.
    const latest=settings.getGuildConfig(i.guildId);
    if(!latest.Economy.Enabled||latest.Store?.VIPRole!==role.id)fail(tr("De winkelinstellingen zijn gewijzigd. Open /store opnieuw."));
    let order;
    try{order=store.reserve(nonce,i.guildId,i.user.id,role.id,days,source);}catch(e){fail(e.message);}
    try{order=await deliver(i.guild,order);}catch(e){logger.warn(`VIP-levering ${order.id}: ${e.message}. Wordt opnieuw geprobeerd.`);}
    return send(i, "editReply", {content:receipt(order),allowedMentions:{parse:[]}});
}
async function show(i,action,source){
    const balance=economy.getOrCreate(i.user.id,i.guildId);
    const memberships=store.memberships(i.guildId,i.user.id);
    const pending=store.pending(i.guildId,i.user.id);
    const creditText=tr("\n🧾 Ongebruikte verplichte rekeningen: {0}. Gebruik /rekening sturen met verplicht:Ja (max €7.000).",credits.available(i.guildId,i.user.id));
    if(action==='status'){
        const text=memberships.map(v=>`<@&${v.role_id}>: ${v.expires_at>Date.now()?tr("tot <t:{0}:f> (<t:{1}:R>)", Math.floor(v.expires_at/1000), Math.floor(v.expires_at/1000)):tr("verlopen; rolverwijdering wordt verwerkt")}`).join('\n');
        return send(i, "editReply", {content:tr("💎 **Mijn VIP**\n{0}{1}\n\nPortemonnee: {2} · Bank: {3}", text||tr("Je hebt geen lopend VIP-pakket uit de winkel."), pending?tr("\n⏳ Een betaalde aankoop wacht nog op roltoekenning."):'', money(balance.wallet), money(balance.bank))+creditText,allowedMentions:{parse:[]}});
    }
    if(action==='geschiedenis'){
        const names={complete:tr("Geleverd"),pending:tr("In behandeling"),refunded:tr("Terugbetaald")};
        const history=[...store.history(i.guildId,i.user.id).map(o=>({...o,kind:'vip'})),...credits.history(i.guildId,i.user.id).map(o=>({...o,kind:'invoice'}))].sort((a,b)=>b.created_at-a.created_at).slice(0,10);
        return send(i, "editReply", {content:tr("🧾 **Laatste 10 aankopen**\n")+(history.map(o=>o.kind==='vip'?tr("<t:{0}:d> · VIP {1} dag(en) · {2} · {3}", Math.floor(o.created_at/1000), o.days, money(o.price), names[o.status]):tr("<t:{0}:d> · Verplichte rekening · €5.000 · {1}",Math.floor(o.created_at/1000),o.used_at?tr("Gebruikt"):tr("Beschikbaar"))).join('\n')||tr("Je hebt nog geen aankopen.")),allowedMentions:{parse:[]}});
    }
    const cfg=settings.getGuildConfig(i.guildId);
    const ready=Boolean(cfg.Economy.Enabled&&cfg.Store?.VIPRole);
    return send(i, "editReply", {embeds:[{title:'🛍️ Community Store',color:0xF1C40F,description:
        tr("**💎 VIP-pakketten**\n1 dag — **€500**\n3 dagen — **€1.300** (bespaar €200)\n7 dagen — **€2.700** (bespaar €800)\n\n")+
        tr("VIP geeft 2× de bestaande chat-XP, counting-XP, daily- en workbeloningen wanneer bonusbeloningen aanstaan. Verlengingen sluiten aan op je huidige eindtijd.\n\n")+
        tr("**🧾 Verplichte rekening — €5.000**\nEenmalig een rekening sturen tot €7.000. Niet te weigeren; +10% per volle 24 uur, afgerond op hele euro’s. Na 7 dagen automatisch betaald, ook met een negatief banksaldo.\n\n")+
        tr("Portemonnee: **{0}** · Bank: **{1}**\nBetalen uit: **{2}**.\n", money(balance.wallet), money(balance.bank), source==='bank'?tr("bankrekening"):tr("portemonnee"))+
        tr("Je bevestigt de aankoop voordat er geld wordt afgeschreven.\nBekijk ook `/store actie:status` en `/store actie:geschiedenis`.")+creditText+
        (ready?'':tr("\n\nVIP is nog niet ingesteld of de economie staat uit."))}],
        components:cfg.Economy.Enabled?[{type:1,components:[...(ready?Object.entries(store.PACKAGES).map(([days,price])=>({type:2,style:1,label:tr("VIP {0} dag{1} · {2}", days, days==='1'?'':'en', money(price)),custom_id:`store:select:${i.user.id}:${days}:${source}`})):[]),{type:2,style:1,label:tr("Verplichte rekening · €5.000"),custom_id:`store:select:${i.user.id}:invoice:${source}`}]}]:[],allowedMentions:{parse:[]}});
}
async function command(client,i){return guarded(i,()=>show(i,i.options.getString('actie')||'winkel',i.options.getString('betaalmiddel')||'wallet'));}
async function button(client,i){return guarded(i,async()=>{
    const [,action,owner,daysText,source,nonce]=i.customId.split(':');
    if(owner!==i.user.id)fail(tr("Deze winkelknop is niet van jou. Open zelf /store."));
    if(daysText==='invoice'){
        if(!['wallet','bank'].includes(source))fail(tr("Ongeldige winkelknop."));
        if(action==='cancel')return send(i,'editReply',tr("Aankoop niet uitgevoerd. Er is niets afgeschreven."));
        if(action==='select')return send(i,'editReply',{content:tr("🧾 Koop één verplichte rekening voor €5.000 spelgeld. Daarna verstuur je deze via /rekening sturen verplicht:Ja (max €7.000). Bevestig je aankoop."),components:[{type:1,components:[{type:2,style:3,label:tr("Kopen"),custom_id:`store:buy:${owner}:invoice:${source}:${randomBytes(12).toString('hex')}`},{type:2,style:2,label:tr("Annuleren"),custom_id:`store:cancel:${owner}:invoice:${source}`}]}],allowedMentions:{parse:[]}});
        if(action!=='buy'||! /^[a-f0-9]{24}$/.test(nonce||''))fail(tr("Ongeldige aankoopbevestiging."));
        try{credits.buy(nonce,i.guildId,i.user.id,source);}catch(e){fail(e.message);}
        return send(i,'editReply',{content:tr("✅ Aankoop geregistreerd: één verplichte rekening voor €5.000. Gebruik /rekening sturen verplicht:Ja. Ongebruikt: {0}.",credits.available(i.guildId,i.user.id)),allowedMentions:{parse:[]}});
    }
    const days=Number(daysText);
    if(!Object.hasOwn(store.PACKAGES,days)||!['wallet','bank'].includes(source))fail(tr("Ongeldige winkelknop."));
    if(action==='select')return send(i, "editReply", {content:tr("💎 **Aankoop bevestigen**\nVIP voor **{0} dag(en)** kost **{1} spelgeld** uit je {2}. Bestaande winkel-VIP wordt verlengd.", days, money(store.PACKAGES[days]), source==='bank'?tr("bankrekening"):tr("portemonnee")),
        components:[{type:1,components:[{type:2,style:3,label:tr("Kopen / verlengen"),custom_id:`store:buy:${owner}:${days}:${source}:${randomBytes(12).toString('hex')}`},{type:2,style:2,label:tr("Annuleren"),custom_id:`store:cancel:${owner}:${days}:${source}`}]}],allowedMentions:{parse:[]}});
    if(action==='cancel')return send(i, "editReply", tr("Aankoop niet uitgevoerd. Er is niets afgeschreven."));
    if(action!=='buy'||! /^[a-f0-9]{24}$/.test(nonce||''))fail(tr("Ongeldige aankoopbevestiging."));
    return buy(i,days,source,nonce);
});}
async function tick(client){
    const collected=invoices.collectDue();
    if(collected)logger.info(`Verplichte rekeningen automatisch betaald: ${collected}.`);
    for(const row of store.jobs()){
        await locked(row.guild_id,row.user_id,async()=>{
            const guild=client.guilds.cache.get(row.guild_id);if(!guild)return;
            let m;
            try{m=await member(guild,row.user_id);}catch(e){if(Number(e.code)!==10007)throw e;}
            await cleanExpired(guild,row.user_id,m);
            const order=store.pending(row.guild_id,row.user_id);if(order)await deliver(guild,order);
            if(m)for(const v of store.memberships(guild.id,row.user_id)){
                if(v.expires_at>Date.now()&&!m.roles.cache.has(v.role_id)){
                    await checkRole(guild,v.role_id);
                    await m.roles.add(v.role_id,"Lopende winkel-VIP hersteld");
                }
            }
        }).catch(e=>logger.warn(`VIP-controle [${row.guild_id}/${row.user_id}]: ${e.message}. Volgende controle opnieuw.`));
    }
}
function start(client){
    if(timer)return;let busy=false;
    const run=async()=>{if(busy)return;busy=true;try{await tick(client);}catch(e){logger.warn(`Winkeltimer: ${e.message}`);}finally{busy=false;}};
    timer=setInterval(run,30000);timer.unref();void run();
}
module.exports={command,button,start,tick,checkRole};
