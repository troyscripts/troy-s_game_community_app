'use strict';
const {PermissionFlagsBits:P,PermissionsBitField:B,MessageFlags}=require('discord.js');
const config=require('../config/config');
const tickets=require('../database/tickets');
const {hasStaffRole,isOwner}=require('../utils/permissions');
const {tr,send,sendLogMessage}=require('../utils/localization');
const logger=require('../utils/logger');
const locks=new Map();
function withTicket(id,fn){const task=(locks.get(id)||Promise.resolve()).catch(()=>{}).then(fn);locks.set(id,task);return task.finally(()=>{if(locks.get(id)===task)locks.delete(id);});}
function fail(text){const e=Error(tr(text));e.ticketInput=true;throw e;}
function staffIds(ticket){return [...new Set([...(ticket.staff_roles_json?JSON.parse(ticket.staff_roles_json):config.StaffRoles),...config.StaffRoles,...['Owner','Developer','HeadAdmin','Admin','HeadModerator','Moderator'].map(k=>config.Roles?.[k])].filter(Boolean))];}
function rank(member,ticket){
    if(member.id===member.guild.ownerId)return 1000000000;
    if(isOwner(member.id))return 999999999;
    const ids=staffIds(ticket);
    const ranks=[...member.roles.cache.values()].filter(r=>ids.includes(r.id)).map(r=>r.position);
    if(ranks.length)return Math.max(...ranks);
    return member.permissions.has(P.Administrator)?member.roles.highest.position:0;
}
function isStaff(member,ticket){return !member.user?.bot && (hasStaffRole(member)||staffIds(ticket).some(id=>member.roles.cache.has(id)));}
function allowedStaff(member,ticket,channel){
    return isStaff(member,ticket) && rank(member,ticket)>=(ticket.staff_min_rank||0) && channel.permissionsFor(member)?.has(P.ViewChannel);
}
async function actorFor(i,ticket){
    const actor=await i.guild.members.fetch({user:i.user.id,force:true});
    if(!allowedStaff(actor,ticket,i.channel))fail('Je hebt geen stafftoegang tot dit ticket.');
    if(actor.id===ticket.user_id)fail('Je kunt je eigen ticket niet als staff beheren.');
    return actor;
}
function snapshot(channel){return [...channel.permissionOverwrites.cache.values()].map(o=>({id:o.id,type:o.type,allow:o.allow.bitfield,deny:o.deny.bitfield}));}
function editPlan(plan,id,type,permissions){
    const old=plan.get(id)||{id,type,allow:0n,deny:0n};const allow=new B(old.allow),deny=new B(old.deny);
    for(const [key,value] of Object.entries(permissions)){allow.remove(P[key]);deny.remove(P[key]);if(value===true)allow.add(P[key]);else if(value===false)deny.add(P[key]);}
    plan.set(id,{...old,allow:allow.bitfield,deny:deny.bitfield});
}
function enforce(plan,channel,ticket,members,botId){
    if(!ticket.claimed_by)return;
    const ids=[...new Set([...(ticket.staff_roles_json?JSON.parse(ticket.staff_roles_json):config.StaffRoles),config.Roles?.Owner,config.Roles?.Developer].filter(Boolean))],minimum=ticket.staff_min_rank||0;
    // Role allows aggregate in Discord. Deny writing on every role overwrite, then
    // allow only the handler and explicit non-staff participants at member level.
    for(const o of [...plan.values()])if(o.type===0)editPlan(plan,o.id,0,{SendMessages:false,ManageThreads:false,CreatePublicThreads:false,CreatePrivateThreads:false});
    editPlan(plan,channel.guild.id,0,{ViewChannel:false,SendMessages:false,ManageThreads:false,CreatePublicThreads:false,CreatePrivateThreads:false});
    for(const id of ids){const role=channel.guild.roles.cache.get(id);if(role)editPlan(plan,id,0,{ViewChannel:role.position>=minimum,ReadMessageHistory:true,SendMessages:false,SendMessagesInThreads:role.position>=minimum});}
    for(const member of members.values()){
        if(member.id===botId||member.id===ticket.user_id||!isStaff(member,ticket))continue;
        const below=rank(member,ticket)<minimum;
        const explicit=plan.get(member.id);
        // Keep manually removed staff denied; takeover always hides lower staff.
        const removed=explicit&&new B(explicit.deny).has(P.ViewChannel);
        editPlan(plan,member.id,1,{...(below?{ViewChannel:false}:{}),SendMessages:!below&&!removed&&member.id===ticket.claimed_by,SendMessagesInThreads:!below&&!removed,CreatePublicThreads:false,CreatePrivateThreads:false});
    }
    editPlan(plan,ticket.user_id,1,{ViewChannel:true,ReadMessageHistory:true,SendMessages:true});
    editPlan(plan,ticket.claimed_by,1,{ViewChannel:true,ReadMessageHistory:true,SendMessages:true,SendMessagesInThreads:true});
    editPlan(plan,botId,1,{ViewChannel:true,ReadMessageHistory:true,SendMessages:true,SendMessagesInThreads:true,ManageThreads:true,CreatePrivateThreads:true});
}
async function log(i,text){
    try {const id=config.Tickets.LogChannel;if(!id)return;const ch=await i.guild.channels.fetch(id);if(ch?.isTextBased())await sendLogMessage(ch,'send',{content:text,allowedMentions:{parse:[]}});}
    catch(e){logger.warn(`Ticketlog: ${e.message}`);}
}
async function guarded(i,fn){
    await i.deferReply({flags:MessageFlags.Ephemeral});
    return withTicket(i.channel.id,async()=>{
        try{
            const ticket=tickets.getTicket(i.channel.id);
            if(!ticket||ticket.guild_id!==i.guildId)fail('Dit kanaal is geen ticket.');
            if(ticket.status!=='open')fail('Dit ticket is gesloten.');
            await i.guild.roles.fetch();
            const actor=await actorFor(i,ticket);
            return await fn(ticket,actor);
        }catch(e){if(!e.ticketInput)logger.warn(`Ticketrechten ${i.channel.id}: ${e.message}`);return send(i,'editReply',{content:e.ticketInput?e.message:tr('De ticketwijziging is niet gelukt. Controleer botrechten en het aantal kanaalrechten.'),allowedMentions:{parse:[]}});}
    });
}
async function claim(_client,i){return guarded(i,async(ticket,actor)=>{
    const takeover=Boolean(ticket.claimed_by&&ticket.claimed_by!==actor.id);
    if(takeover){
        const previous=await i.guild.members.fetch({user:ticket.claimed_by,force:true}).catch(e=>{if(Number(e.code)===10007)return null;throw e;});
        if(previous&&rank(actor,ticket)<=rank(previous,ticket))fail('Alleen hogere staff kan deze claim overnemen.');
    }
    const minimum=takeover?Math.max(ticket.staff_min_rank||0,rank(actor,ticket)):(ticket.staff_min_rank||0);
    const updated={...ticket,claimed_by:actor.id,staff_min_rank:minimum};
    const members=await i.guild.members.fetch();const me=await i.guild.members.fetchMe();
    if(takeover&&[...members.values()].some(m=>m.id!==ticket.user_id&&!m.user?.bot&&isStaff(m,ticket)&&rank(m,ticket)<minimum&&m.permissions.has(P.Administrator)))fail('Lagere staff met Administrator kan niet worden uitgesloten. Pas eerst hun Discordrechten aan.');
    const before=snapshot(i.channel),plan=new Map(before.map(o=>[o.id,o]));
    enforce(plan,i.channel,updated,members,me.id);
    await i.channel.permissionOverwrites.set([...plan.values()],`Ticketclaim door ${actor.id}`);
    try{if(!tickets.assignClaim(ticket.channel_id,actor.id,minimum,ticket.claimed_by).changes)throw Error('Claim gewijzigd tijdens verwerking');}
    catch(e){await i.channel.permissionOverwrites.set(before,'Herstel mislukte ticketclaim');throw e;}
    const text=ticket.claimed_by===actor.id?tr('🎫 De claimrechten voor ticket <#{0}> zijn opnieuw toegepast.',ticket.channel_id):takeover?tr('🎫 <@{0}> heeft ticket <#{1}> overgenomen van <@{2}>. Lagere staff heeft geen toegang meer.',actor.id,ticket.channel_id,ticket.claimed_by):tr('🎫 <@{0}> heeft ticket <#{1}> geclaimd. Andere staff kan meelezen en overleggen in de staffthread.',actor.id,ticket.channel_id);
    await log(i,text);
    await send(i.channel,'send',{content:text,allowedMentions:{parse:[]}}).catch(e=>logger.warn(e.message));
    return send(i,'editReply',{content:text,allowedMentions:{parse:[]}});
});}
async function change(i,remove){return guarded(i,async(ticket,actor)=>{
    const user=i.options.getUser('gebruiker'),roleOption=i.options.getRole('rol');
    if(Boolean(user)===Boolean(roleOption))fail('Kies precies één gebruiker of rol.');
    const members=await i.guild.members.fetch();const me=await i.guild.members.fetchMe();
    const target=user?members.get(user.id):null;
    const role=roleOption?i.guild.roles.cache.get(roleOption.id):null;
    if(user&&!target)fail('Deze gebruiker zit niet op deze server.');
    const affected=role?[...members.values()].filter(m=>m.roles.cache.has(role.id)):[target];
    if(role&&(role.id===i.guild.id||role.managed))fail('Deze rol mag je niet aan een ticket toevoegen of eruit verwijderen.');
    if(!user&&!role)fail('Deze rol bestaat niet meer.');
    if(role&&role.position>=rank(actor,ticket))fail('Je kunt geen gelijke of hogere rol beheren.');
    for(const m of affected){
        if(!m)continue;
        if(m.user?.bot||m.id===me.id||m.id===ticket.user_id||m.id===ticket.claimed_by||m.id===actor.id)fail('De ticketmaker, behandelaar, jezelf en bots zijn beschermd tegen deze wijziging.');
        if(isStaff(m,ticket)&&rank(m,ticket)>=rank(actor,ticket))fail('Je kunt geen gelijke of hogere staff uit een ticket halen of hun toegang wijzigen.');
        if(remove&&m.permissions.has(P.Administrator))fail('Discord laat niet toe dat kanaalrechten een administrator uitsluiten.');
        if(!remove&&isStaff(m,ticket)&&rank(m,ticket)<(ticket.staff_min_rank||0))fail('Deze staff valt onder het minimum van de overgenomen claim.');
    }
    const before=snapshot(i.channel),plan=new Map(before.map(o=>[o.id,o]));
    const id=user?.id||role.id;
    editPlan(plan,id,user?1:0,remove?{ViewChannel:false,SendMessages:false,SendMessagesInThreads:false}:{ViewChannel:true,ReadMessageHistory:true,SendMessages:true,SendMessagesInThreads:false,ManageThreads:false,CreatePublicThreads:false,CreatePrivateThreads:false});
    enforce(plan,i.channel,ticket,members,me.id);
    // Role additions can allow writing to ordinary participants, but explicit
    // member denies created above keep all other staff read-only.
    if(!remove&&role){editPlan(plan,id,0,{ViewChannel:true,ReadMessageHistory:true,SendMessages:true,SendMessagesInThreads:false});for(const m of affected)if(!isStaff(m,ticket))editPlan(plan,m.id,1,{SendMessages:true,ManageThreads:false,CreatePrivateThreads:false,CreatePublicThreads:false});}
    if(remove&&role)editPlan(plan,id,0,{ViewChannel:false,SendMessages:false,SendMessagesInThreads:false});
    await i.channel.permissionOverwrites.set([...plan.values()],`Tickettoegang door ${actor.id}`);
    const mention=user?`<@${id}>`:`<@&${id}>`;
    const text=tr('🎫 {0}: {1} in ticket <#{2}>. Uitgevoerd door <@{3}>.',remove?tr('Toegang verwijderd'):tr('Toegang toegevoegd'),mention,ticket.channel_id,actor.id);
    await log(i,text);return send(i,'editReply',{content:text,allowedMentions:{parse:[]}});
});}
module.exports={withTicket,rank,isStaff,allowedStaff,claim,change,enforce,editPlan};
