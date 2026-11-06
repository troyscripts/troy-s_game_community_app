const { ActionRowBuilder: Row, StringSelectMenuBuilder: Select, RoleSelectMenuBuilder: Roles,
 UserSelectMenuBuilder: Users, ChannelSelectMenuBuilder: Channels, ButtonBuilder: Button,
 ButtonStyle, ChannelType, MessageFlags, PermissionFlagsBits: P } = require('discord.js');
const presets = require('../config/governmentDepartments.json');
const store = require('../database/governmentTickets');
const { display } = require('./governmentLabels');
const { hasNotifyAccess } = require('../utils/permissions');
const { canHandle } = require('./governmentAccess');
const { createTranscript } = require('./boundedTranscript');
const locks = new Set();
const row = component => new Row().addComponents(component);
const button = (id,label,style=ButtonStyle.Secondary) => new Button().setCustomId(id).setLabel(label).setStyle(style);
const privateReply = (i,content) => i.reply({content,flags:MessageFlags.Ephemeral,allowedMentions:{parse:[]}});
function configure(builder,service) {
 return builder.addStringOption(o=>o.setName('instellen').setDescription('Kies een afdeling om in te stellen; leeg laten plaatst het paneel.').addChoices(...presets[service].map((name,i)=>({name,value:String(i)}))))
 .addStringOption(o=>o.setName('naam').setDescription('Optionele aangepaste naam voor de gekozen afdeling.').setMaxLength(80))
 .addStringOption(o=>o.setName('omschrijving').setDescription('Leg uit waarvoor iemand bij deze afdeling een ticket opent.').setMaxLength(100));
}
function setup(i,s,d) {
 const c=store.get(i.guildId,s,d); const shown=display(s,d,c,i.guild.roles.cache); const base=`gov:cfg:${s}:${d}:${i.user.id}`;
 return { content:`**${s} — ${shown.label}**\n${shown.description}\nStatus: ${c.enabled?'actief':'uitgeschakeld'}\nCategorie: ${c.category?`<#${c.category}>`:'nog niet gekozen'}\nRollen: ${c.roles.map(x=>`<@&${x}>`).join(', ')||'geen'}\nVerantwoordelijken: ${c.users.map(x=>`<@${x}>`).join(', ')||'geen'}\nSelecties worden direct opgeslagen voor nieuwe tickets. Activeer na het instellen en plaats daarna het paneel met /${s}.`, allowedMentions:{parse:[]}, components:[
 row(new Roles().setCustomId(`${base}:roles`).setPlaceholder('Behandelrollen selecteren (vervangt de lijst)').setMinValues(0).setMaxValues(10)),
 row(new Users().setCustomId(`${base}:users`).setPlaceholder('Verantwoordelijke personen (vervangt de lijst)').setMinValues(0).setMaxValues(10)),
 row(new Channels().setCustomId(`${base}:category`).setPlaceholder('Categorie voor binnenkomende tickets').setChannelTypes(ChannelType.GuildCategory).setMinValues(1).setMaxValues(1)),
 row(button(`${base}:toggle`,c.enabled?'Afdeling uitschakelen':'Afdeling activeren',ButtonStyle.Primary))
 ]};
}
async function command(client,i,s) {
 const member=await i.guild.members.fetch({user:i.user.id,force:true});
 if (!hasNotifyAccess(member,i.user.id)) return privateReply(i,'Alleen Head Admin of hoger kan dit paneel instellen of plaatsen.');
 const d=i.options.getString('instellen'); const label=i.options.getString('naam'); const description=i.options.getString('omschrijving');
 if (d !== null) {
  if (!presets[s]?.[d]) return privateReply(i,'Onbekende afdeling.');
  await i.guild.roles.fetch();
  if(label || description) { const c=store.get(i.guildId,s,d); if(label) c.label=label; if(description) c.description=description; store.save(i.guildId,s,d,c); }
  return i.reply({...setup(i,s,d),flags:MessageFlags.Ephemeral});
 }
 if(label || description) return privateReply(i,'Kies bij een aangepaste naam of omschrijving ook een afdeling bij instellen.');
 await i.deferReply({flags:MessageFlags.Ephemeral});
 const roles=await i.guild.roles.fetch();
 const options=presets[s].flatMap((name,d)=>{const c=store.get(i.guildId,s,String(d));return c.enabled?[{...display(s,String(d),c,roles),value:String(d)}]:[];});
 if(!options.length) return i.editReply(`Stel eerst een afdeling in via /${s} instellen.`);
 if(i.channel.type!==ChannelType.GuildText) return i.editReply('Plaats het paneel in een normaal tekstkanaal.');
 const title=s==='overheidscoordinator'?'OVERHEIDSCOÖRDINATOR':s.toUpperCase();
 const payload={content:`**${title} | Tickets**\nKies hieronder waarvoor je contact wilt opnemen. Onder elke afdeling staat een korte uitleg. Je krijgt een privé-ticket.`,components:[row(new Select().setCustomId(`gov:open:${s}`).setPlaceholder('Kies een afdeling').addOptions(options))],allowedMentions:{parse:[]}};
 // Refresh a recent panel instead of leaving the unreadable menu beside a new one.
 const recent=await i.channel.messages.fetch({limit:100});
 const existing=recent.find(m=>m.author.id===client.user.id && m.components.some(r=>r.components.some(c=>c.customId===`gov:open:${s}`)));
 if(existing) await existing.edit(payload);
 else await i.channel.send(payload);
 return i.editReply(existing?'Het bestaande ticketpaneel is bijgewerkt met namen en uitleg.':'Het ticketpaneel is in dit kanaal geplaatst.');
}
async function interact(client,i) {
 if(!i.guild) return privateReply(i,'Dit werkt alleen in een server.');
 const [,action,s,d,actor,field]=i.customId.split(':');
 if(action==='cfg') {
  const member=await i.guild.members.fetch({user:i.user.id,force:true});
  if(actor!==i.user.id || !hasNotifyAccess(member,i.user.id)) return privateReply(i,'Deze instellingen zijn alleen beschikbaar voor de bevoegde beheerder die ze opende.');
  if(!presets[s]?.[d]) return privateReply(i,'Onbekende afdeling.');
  await i.deferUpdate();
  const c=store.get(i.guildId,s,d);
  if(field==='roles') {
   const roles=await i.guild.roles.fetch();
   if(i.values.some(id=>id===i.guildId || !roles.has(id) || roles.get(id).managed)) return i.followUp({content:'Kies gewone afdelingsrollen, geen @everyone of botrollen.',flags:MessageFlags.Ephemeral});
   c.roles=i.values;
  } else if(field==='users') {
   const members=await Promise.all(i.values.map(user=>i.guild.members.fetch({user,force:true})));
   if(members.some(m=>m.user.bot)) return i.followUp({content:'Selecteer personen, geen bots.',flags:MessageFlags.Ephemeral});
   c.users=i.values;
  } else if(field==='category') {
   const cat=await i.guild.channels.fetch(i.values[0]);
   if(cat?.type!==ChannelType.GuildCategory) throw Error('Ongeldige ticketcategorie');
   c.category=cat.id;
  } else if(field==='toggle') c.enabled=!c.enabled;
  else return;
  if(c.enabled && (!c.category || (!c.roles.length && !c.users.length))) {
   c.enabled=false;
  }
  store.save(i.guildId,s,d,c);
  return i.editReply(setup(i,s,d));
 }
 if(action==='open') {
  const dept=i.values?.[0];
  if(!presets[s]?.[dept]) return privateReply(i,'Onbekende afdeling.');
  const key=`${i.guildId}:${s}:${dept}:${i.user.id}`;
  if(locks.has(key)) return privateReply(i,'Je ticket wordt al aangemaakt.');
  locks.add(key);
  try {
   await i.deferReply({flags:MessageFlags.Ephemeral});
   const c=store.get(i.guildId,s,dept);
   if(!c.enabled) return i.editReply('Deze afdeling is nog niet beschikbaar.');
   const existing=store.existing(i.guildId,s,dept,i.user.id);
   if(existing) {
    let channel; try {channel=await i.guild.channels.fetch(existing.channel);} catch(e) {if(e.code!==10003) throw e;}
    if(channel) return i.editReply(`Je hebt hier al een ticket: <#${channel.id}>`);
    store.remove(i.guildId,existing.channel);
   }
   const cat=await i.guild.channels.fetch(c.category);
   const me=await i.guild.members.fetchMe();
   const needed=[P.ViewChannel,P.ManageChannels,P.ManageRoles,P.SendMessages,P.ReadMessageHistory,P.AttachFiles];
   if(cat?.type!==ChannelType.GuildCategory || !cat.permissionsFor(me)?.has(needed)) return i.editReply('De categorie ontbreekt of de bot mist rechten: kanalen/rollen beheren, kanaal bekijken, berichten verzenden, geschiedenis lezen en bestanden bijvoegen.');
   const roles=await i.guild.roles.fetch();
   if(c.roles.some(id=>id===i.guildId || !roles.has(id) || roles.get(id).managed)) return i.editReply('Een ingestelde afdelingsrol ontbreekt of is ongeldig. Laat de beheerder de rollen opnieuw kiezen.');
   if(!c.roles.length&&!c.users.length) return i.editReply('Deze afdeling heeft geen behandelaars ingesteld.');
   const permissions=[P.ViewChannel,P.SendMessages,P.ReadMessageHistory,P.AttachFiles,P.EmbedLinks];
   const overwrites=new Map();
   overwrites.set(i.guildId,{id:i.guildId,type:0,deny:[P.ViewChannel]});
   for(const id of c.roles) overwrites.set(id,{id,type:0,allow:permissions});
   for(const id of [...c.users,i.user.id]) overwrites.set(id,{id,type:1,allow:permissions});
   overwrites.set(me.id,{id:me.id,type:1,allow:[...permissions,P.ManageChannels,P.ManageRoles]});
   const channel=await i.guild.channels.create({name:`${s}-${i.user.id.slice(-6)}`,type:ChannelType.GuildText,parent:cat.id,permissionOverwrites:[...overwrites.values()],reason:`Overheidsticket ${s}/${dept}`});
   try {
    store.add({channel:channel.id,guild:i.guildId,service:s,department:dept,owner:i.user.id,access:JSON.stringify({roles:c.roles,users:c.users})});
    await channel.send({content:`<@${i.user.id}> — **${display(s,dept,c,roles).label}**\n${display(s,dept,c,roles).description}\nBeschrijf hieronder je vraag. Een afdelingsmedewerker helpt je verder.`,allowedMentions:{users:[i.user.id]},components:[new Row().addComponents(button('gov:claim','Claimen',ButtonStyle.Primary),button('gov:transcript','Transcript'),button('gov:close','Sluiten',ButtonStyle.Danger))]});
   } catch(e) { try {await channel.delete();store.remove(i.guildId,channel.id);} catch(cleanup) {console.error('[Overheid] Ticket bewaard na fout:',channel.id,cleanup.message);} throw e; }
   return i.editReply(`Je ticket is aangemaakt: <#${channel.id}>`);
  } finally {locks.delete(key);}
 }
 const t=store.ticket(i.guildId,i.channelId);
 if(!t) return privateReply(i,'Dit is geen overheidsticket.');
 const member=await i.guild.members.fetch({user:i.user.id,force:true});
 const handler=canHandle(member,JSON.parse(t.access));
 if(!handler && !(action==='transcript' && t.owner===i.user.id)) return privateReply(i,'Alleen de ingestelde afdelingsrollen en verantwoordelijken kunnen dit ticket behandelen.');
 if(!i.channel.permissionsFor(member)?.has(P.ViewChannel)) return privateReply(i,'Je hebt geen toegang tot dit ticket.');
 if(action==='close') return privateReplyWithButtons(i);
 const key=`channel:${i.channelId}`;
 if(locks.has(key)) return privateReply(i,'Er wordt al een ticketactie verwerkt.');
 locks.add(key);
 try {
  await i.deferReply({flags:MessageFlags.Ephemeral});
  if(action==='claim') {
   if(!store.claim(i.guildId,i.channelId,i.user.id)) return i.editReply('Dit ticket is al geclaimd of gesloten.');
   await i.channel.send({content:`Ticket geclaimd door <@${i.user.id}>.`,allowedMentions:{parse:[]}});
   return i.editReply('Je behandelt dit ticket. Andere afdelingsmedewerkers behouden toegang.');
  }
  if(action==='transcript') return i.editReply({files:[await createTranscript(i.channel,{filename:`overheid-${i.channelId}.html`})]});
  if(action==='confirmclose') {
   if(t.status==='closed') return i.editReply('Dit ticket is al gesloten.');
   // Keep the channel as an archive; export remains possible and no messages are deleted.
   await i.channel.permissionOverwrites.edit(t.owner,{SendMessages:false});
   store.close(i.guildId,i.channelId);
   await i.channel.send({content:'**Ticket gesloten.** Het kanaal blijft als archief bewaard. De aanvrager kan een nieuw ticket openen.',allowedMentions:{parse:[]}});
   return i.editReply('Gesloten en bewaard. Download desgewenst een transcript; verwijderen kan via Discord.');
  }
 } finally {locks.delete(key);}
}
function privateReplyWithButtons(i) {
 return i.reply({content:'Ticket sluiten? De aanvrager kan daarna niet meer typen. Het kanaal blijft als archief bestaan.',flags:MessageFlags.Ephemeral,components:[row(button('gov:confirmclose','Sluiten bevestigen',ButtonStyle.Danger))]});
}
module.exports={configure,command,interact};
