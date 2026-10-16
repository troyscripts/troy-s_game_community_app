'use strict';
const { MessageFlags, PermissionFlagsBits: P } = require('discord.js');
const { tr, send } = require('../utils/localization');
const data = require('../database/living');
const settings = require('../database/guildSettings');
const logger = require('../utils/logger');
const COLORS = {starter:0xCD7F32,luxe:0xC0C0C0,villa:0xFFD700};
const locks = new Map();
let timer;
function locked(g,fn) {
    const task = (locks.get(g)||Promise.resolve()).catch(()=>{}).then(fn);
    locks.set(g,task);
    return task.finally(()=>{if(locks.get(g)===task)locks.delete(g);});
}
function fail(text) { const error=new Error(tr(text)); error.livingInput=true; throw error; }
const money = value => `€${Number(value).toLocaleString('nl-NL')}`;
const reply = (i,content) => send(i,'editReply',{content,allowedMentions:{parse:[]}});
async function ensureRoles(guild) {
    const me=await guild.members.fetchMe();
    if(!me.permissions.has(P.ManageRoles)) fail('De bot heeft Rollen beheren nodig voor woningrollen.');
    const result={};
    for(const [key,item] of Object.entries(data.HOMES)) {
        const stored=data.roles(guild.id).find(r=>r.home===key);
        let role=stored ? await guild.roles.fetch(stored.role_id) : null;
        if(!role) {
            // Never adopt an unrelated role by name: it may carry privileged permissions.
            role=await guild.roles.create({name:item.role,color:COLORS[key],permissions:[],mentionable:false,reason:'Economy woningrollen'});
            data.setRole(guild.id,key,role.id);
        }
        if(role.managed || role.id===guild.id || !role.editable || role.permissions.bitfield!==0n)
            fail('Zet de botrol boven de woningrollen en geef woningrollen geen extra rechten.');
        if(role.color!==COLORS[key]) await role.setColor(COLORS[key],'Woningkleur: brons, zilver of goud');
        result[key]=role;
    }
    return result;
}
async function syncMember(guild,user,roles) {
    let member;
    try { member=await guild.members.fetch({user,force:true}); }
    catch(error) { if(Number(error.code)===10007) { data.done(guild.id,user); return; } throw error; }
    const row=data.home(guild.id,user);
    const wanted=row ? roles[row.home].id : null;
    for(const role of Object.values(roles)) {
        if(role.id!==wanted && member.roles.cache.has(role.id)) await member.roles.remove(role.id,'Vorige woning verlaten');
    }
    if(wanted && !member.roles.cache.has(wanted)) await member.roles.add(wanted,'Economy woning');
    data.done(guild.id,user);
}
async function guarded(i,fn) {
    await i.deferReply({flags:MessageFlags.Ephemeral});
    try { return await locked(i.guildId,fn); }
    catch(error) {
        if(!error.livingInput) logger.warn(`Makelaar/supermarkt [${i.guildId}]: ${error.message}`);
        return reply(i,error.livingInput ? error.message : tr('Deze actie kon niet volledig worden afgerond. Controleer je status. Opgeslagen woningrollen worden automatisch opnieuw verwerkt.'));
    }
}
function enabled(i) { if(!settings.getGuildConfig(i.guildId).Economy.Enabled) fail('De economie staat uit in deze server.'); }
function confirmed(i) { if(!i.options.getBoolean('bevestigen')) fail('Bekijk eerst het aanbod en de voorwaarden. Herhaal je actie met bevestigen:Ja om door te gaan.'); }
async function realtor(client,i) { return guarded(i,async()=>{
    const action=i.options.getString('actie')||'aanbod',g=i.guildId,u=i.user.id;
    if(action==='aanbod') {
        const lines=Object.entries(data.HOMES).map(([key,h])=>tr('**{0}** · {1}\n{2}\nHuur: {3} per 24 uur · Koop: {4} · XP/inkomen: +{5}%.',tr(h.name),tr({starter:'Brons',luxe:'Zilver',villa:'Goud'}[key]),tr(h.description),money(h.rent),money(h.price),h.bonus*100));
        return reply(i,tr('🏡 **Makelaar**\n\n')+lines.join('\n\n')+'\n\n'+tr('Eén woning per speler. Bij verhuizen ontvang je 15% van de aankoopprijs van je oude koopwoning; huur levert niets terug. De eerste huurdag betaal je direct. Daarna schrijven we elke 24 uur huur van je bank af, ook bij onvoldoende saldo en na botuitval. Je bank kan negatief worden. Opzeggen stopt toekomstige huur, zonder terugbetaling. Woningen en huurcontracten blijven behouden bij resets. De woningbonus komt boven op VIP. Gebruik actie:kopen of huren, kies een woning en bevestigen:Ja.'));
    }
    if(action==='status') {
        const row=data.home(g,u);
        if(!row) return reply(i,tr('Je hebt nog geen woning. Bekijk /makelaar actie:aanbod.'));
        const h=data.HOMES[row.home];
        return reply(i,tr('🏡 **Mijn woning: {0}**\nWoonvorm: {1}\nExtra XP en inkomen: +{2}% boven op VIP.\n{3}\nWoning en contract blijven behouden bij resets.',tr(h.name),tr(row.mode==='koop'?'Koop':'Huur'),h.bonus*100,row.mode==='huur'?tr('Volgende huur: {0} op <t:{1}:f>. Automatisch via bank; negatief saldo is mogelijk.',money(h.rent),Math.floor(row.next_rent/1000)):tr('Bij verhuizen krijg je {0} terug.',money(Math.floor(row.paid_price*0.15)))));
    }
    confirmed(i);
    // Allow tenants to end their ongoing contract even when economy is disabled.
    if(action!=='opzeggen') enabled(i);
    if(!['kopen','huren','opzeggen'].includes(action)) fail('Ongeldige actie.');
    let roles;
    if(action!=='opzeggen') roles=await ensureRoles(i.guild);
    let result;
    if(action==='opzeggen') result=data.leave(i.id,g,u);
    else result=data.move(i.id,g,u,i.options.getString('woning'),action==='kopen'?'koop':'huur',i.options.getString('betaalmiddel')||'wallet');
    let synced=true;
    try { roles ||= await ensureRoles(i.guild); await syncMember(i.guild,u,roles); }
    catch(error) { synced=false; logger.warn(`Woningrol wacht op herstel [${g}/${u}]: ${error.message}`); }
    const content=result.cancelled ? tr('✅ Huur opgezegd. Er volgt geen nieuwe huur; al vervallen huur is afgerekend. Je woningbonus stopt direct.') : tr('✅ {0} {1}. Betaald: {2}. Terug voor vorige koopwoning: {3}. Je woningbonus is actief.',tr(data.HOMES[result.home].name),tr(result.mode==='koop'?'gekocht':'gehuurd'),money(result.cost),money(result.refund));
    return reply(i,content+(synced?'':'\n'+tr('Je wijziging is opgeslagen. De Discord-rol wordt automatisch opnieuw verwerkt; je wordt niet opnieuw belast.')));
}); }
async function supermarket(client,i) { return guarded(i,async()=>{
    const action=i.options.getString('actie')||'aanbod',g=i.guildId,u=i.user.id;
    if(action==='aanbod') return reply(i,tr('🛒 **Supermarkt**\n')+Object.values(data.PRODUCTS).map(p=>`${tr(p.name)} · ${money(p.price)}`).join('\n')+'\n\n'+tr('Koop met actie:kopen, product, aantal en bevestigen:Ja. Bekijk je voorraad met actie:voorraad en eet/drink met actie:gebruiken. Dit zijn rollenspelproducten zonder extra bonus. Je voorraad blijft behouden bij alle resets.'));
    if(action==='voorraad') return reply(i,tr('🛍️ **Mijn voorraad**\n')+(data.inventory(g,u).map(row=>`${tr(data.PRODUCTS[row.product].name)} × ${row.quantity}`).join('\n')||tr('Je voorraad is leeg.')));
    if(!['kopen','gebruiken'].includes(action)) fail('Ongeldige actie.');
    enabled(i); confirmed(i);
    const result=data.groceries(i.id,g,u,i.options.getString('product'),i.options.getInteger('aantal')||1,i.options.getString('betaalmiddel')||'wallet',action==='gebruiken');
    return reply(i,result.used ? tr('🍽️ Je hebt {0} × {1} gebruikt. Eet smakelijk / proost!',result.quantity,tr(data.PRODUCTS[result.product].name)) : tr('✅ Gekocht: {0} × {1} voor {2}. Opgeslagen in je voorraad.',result.quantity,tr(data.PRODUCTS[result.product].name),money(result.cost)));
}); }
async function tick(client) {
    // SQLite transactions are synchronous: debit and due-date update cannot interleave.
    for(const row of data.homes()) {
        if(!client.guilds.cache.has(row.guild_id)) continue;
        try { data.collectRent(row.guild_id,row.user_id); } catch(error) { logger.warn(`Huur: ${error.message}`); }
    }
    const jobs=data.jobs();
    for(const guildId of new Set(jobs.map(row=>row.guild_id))) {
        const guild=client.guilds.cache.get(guildId); if(!guild) continue;
        await locked(guildId,async()=>{
            let roles;
            try { roles=await ensureRoles(guild); } catch(error) { logger.warn(`Woningrollen [${guildId}]: ${error.message}`); return; }
            for(const row of data.jobs().filter(job=>job.guild_id===guildId)) {
                try { await syncMember(guild,row.user_id,roles); } catch(error) { logger.warn(`Woningrol [${guildId}/${row.user_id}]: ${error.message}`); }
            }
        });
    }
}
function start(client) {
    if(timer) return;
    let running=false,lastRepair=0;
    const run=async()=>{
        if(running) return; running=true;
        try {
            if(Date.now()-lastRepair>=300000) { for(const row of data.homes()) data.queue(row.guild_id,row.user_id); lastRepair=Date.now(); }
            await tick(client);
        } catch(error) { logger.warn(`Makelaar: ${error.message}`); } finally { running=false; }
    };
    timer=setInterval(run,30000);timer.unref();void run();
}
module.exports={realtor,supermarket,start,tick,ensureRoles,syncMember,COLORS};
