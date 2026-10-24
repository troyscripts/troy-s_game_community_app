'use strict';
const {SlashCommandBuilder,MessageFlags,PermissionFlagsBits:P}=require('discord.js');
const audit=require('../../services/discordAudit');
const config=require('../../config/config');
module.exports={
 data:new SlashCommandBuilder().setName('logs').setDescription('Controleer Discordlogs en hun locaties.')
 .addSubcommand(s=>s.setName('status').setDescription('Toon kanalen, rechten en verzendstatus.'))
 .addSubcommand(s=>s.setName('test').setDescription('Zet een testbericht in de logwachtrij.').addStringOption(o=>o.setName('categorie').setDescription('Logcategorie').setRequired(true).addChoices(...audit.CATEGORIES.map(c=>({name:c,value:c})))))
 .addSubcommand(s=>s.setName('opnieuw').setDescription('Probeer mislukte logs opnieuw na herstel van kanaal/rechten.')),
 category:'Administration',permissions:['Administrator'],guildOnly:true,
 async execute(client,i){
  await i.deferReply({flags:MessageFlags.Ephemeral});
  return config.__context.run(i.guild.id,async()=>{
   const sub=i.options.getSubcommand();
   if(sub==='opnieuw')return i.editReply(`${audit.retry(i.guild.id)} mislukte logs opnieuw ingepland.`);
   if(sub==='test'){
    const category=i.options.getString('categorie');
    if(!audit.CATEGORIES.includes(category))return i.editReply('Onbekende categorie.');
    const id=audit.enqueue(i.guild,category,'Logtest',`Aangevraagd door ${i.user.id}`);
    return i.editReply(id?`Test ${id} staat in de wachtrij voor ${category}. Controleer /logs status.`:'Geen test verzonden: logging/categorie uitgeschakeld of geen kanaal ingesteld.');
   }
   const me=await i.guild.members.fetchMe();const checked=new Map(),lines=[];
   for(const category of audit.CATEGORIES){
    const id=audit.route(category);
    if(!audit.enabled(category)){lines.push(`${category}: uit`);continue;}
    if(!id){lines.push(`${category}: geen kanaal`);continue;}
    if(!checked.has(id)){
     try{const ch=await i.guild.channels.fetch(id);const valid=ch?.guild?.id===i.guild.id&&ch.isTextBased?.()&&typeof ch.send==='function';checked.set(id,valid&&ch.permissionsFor(me)?.has([P.ViewChannel,P.EmbedLinks,ch.isThread?.()?P.SendMessagesInThreads:P.SendMessages])?'OK':'ongeldig kanaal / onvoldoende rechten');}
     catch(e){checked.set(id,`niet bereikbaar (${e.code||'fout'})`);}
    }
    lines.push(`${category}: <#${id}> — ${checked.get(id)}`);
   }
   const counts=audit.status(i.guild.id).map(r=>`${r.status}: ${r.count}`).join(' · ')||'Nog geen logs';
   const extra=`Auditlog lezen: ${me.permissions.has(P.ViewAuditLog)?'ja':'NEE'}\nPresence-intent: ${process.env.PRESENCE_INTENT==='true'?'aan':'uit'}\nBewaring: ${config.Logging.RetentionDays} dagen, maximaal ${config.Logging.MaxRecords} records.`;
   return i.editReply({content:lines.join('\n')+'\n\n'+counts+'\n'+extra,allowedMentions:{parse:[]}});
  });
 }
};
