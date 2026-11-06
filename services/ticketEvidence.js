const { createHash } = require('node:crypto');
const evidence = require('../database/ticketEvidence');
const logger = require('../utils/logger');
const view = require('./ticketTranscriptView');
const MAX_FILE = 25 * 1024 * 1024;
const MAX_TICKET = 100 * 1024 * 1024;
const pending = new Map();
const lanes = [Promise.resolve(),Promise.resolve()];
let lane=0;
function ids(message) {return [message.guildId || message.guild?.id,message.channelId || message.channel?.id];}
function tracked(channel) {return evidence.tracked(channel.guildId || channel.guild?.id,channel.id);}
function validURL(value) {
 const url=new URL(value);
 if(url.protocol!=='https:' || !['cdn.discordapp.com','media.discordapp.net'].includes(url.hostname) || url.username || url.password || url.port) throw Error('Bijlage heeft geen toegestane Discord-CDN-url.');
 return url.href;
}
async function download(f) {
 try {
  if(f.size>MAX_FILE)throw Error('Bijlage groter dan 25 MB; handmatig veiligstellen vereist.');
  const used=evidence.files(f.guild,f.channel).reduce((n,x)=>n+(x.bytes?.length||0),0);
  if(used+f.size>MAX_TICKET)throw Error('Bijlagenarchief groter dan 100 MB per kanaal.');
  const response=await fetch(validURL(f.url),{redirect:'error',signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error(`CDN gaf HTTP ${response.status}.`);
  if(Number(response.headers.get('content-length')||0)>MAX_FILE)throw Error('Bijlage groter dan 25 MB.');
  const parts=[];let size=0;
  for await(const part of response.body) {
   size+=part.length;
   if(size>MAX_FILE) {throw Error('Bijlage groter dan 25 MB.');}
   parts.push(Buffer.from(part));
  }
  const current=evidence.files(f.guild,f.channel).reduce((n,x)=>n+(x.bytes?.length||0),0);
  if(current+size>MAX_TICKET)throw Error('Bijlagenarchief groter dan 100 MB per kanaal.');
  evidence.saved(f,Buffer.concat(parts));
 } catch(error) {
  evidence.saved(f,null,String(error.message).slice(0,300));
  logger.warn(`Ticketbijlage niet veiliggesteld: server ${f.guild}, kanaal ${f.channel}, bericht ${f.message}, bijlage ${f.attachment}: ${error.message}`);
 }
}
function enqueue(f) {
 if(f.bytes!==null)return;
 const key=[f.guild,f.channel,f.message,f.attachment].join(':');
 if(pending.has(key))return;
 const index=lane++%lanes.length;
 const task=lanes[index].catch(()=>{}).then(()=>download(f));
 lanes[index]=task;
 pending.set(key,{channel:f.channel,promise:task});
 task.catch(error=>logger.error(`Ticketarchief: ${error.message}`)).finally(()=>{if(pending.get(key)?.promise===task)pending.delete(key);});
}
function capture(message) {
 const [g,c]=ids(message);
 if(!g||!c||!evidence.tracked(g,c)||message.partial)return false;
 const files=[...(message.attachments?.values()||[])].map(a=>({id:a.id,name:a.name||'bijlage',url:a.url,size:Number(a.size)||0}));
 const names={users:{},roles:{},channels:{}};
 for(const [id,u]of message.mentions?.users||[])names.users[id]=u.globalName||u.username;
 for(const [id,r]of message.mentions?.roles||[])names.roles[id]=r.name;
 for(const [id,c]of message.mentions?.channels||[])names.channels[id]=c.name;
 const payload={displayName:message.member?.displayName||message.author?.globalName||message.author?.username,bot:Boolean(message.author?.bot),names,author:message.author?.tag||message.author?.username||'Onbekend',authorId:message.author?.id||'',
 content:message.content||'',edited:message.editedTimestamp||null,embeds:(message.embeds||[]).map(e=>e.toJSON?e.toJSON():e),attachments:files.map(f=>({id:f.id,name:f.name}))};
 const fingerprint=createHash('sha256').update(JSON.stringify({visible:view.visible(payload),edited:payload.edited})).digest('hex');
 evidence.record(g,c,message.id,message.createdTimestamp||Date.now(),fingerprint,payload,files);
 for(const f of files)enqueue(evidence.file(g,c,message.id,f.id));
 return true;
}
function deleted(message) {
 const [g,c]=ids(message);if(!g||!c||!evidence.tracked(g,c))return;
 capture(message);
 evidence.deleted(g,c,message.id,message.createdTimestamp||Date.now());
}
function observe(message,remove=false) {
 try {if(remove)deleted(message);else capture(message);}catch(error){logger.error(`Ticketarchief opslaan mislukt: ${error.message}`);}
}
async function flush(channel,retry=false) {
 const g=channel.guildId||channel.guild.id;
 await Promise.all([...pending.values()].filter(x=>x.channel===channel.id).map(x=>x.promise));
 if(retry) {
  for(const f of evidence.files(g,channel.id))if(f.bytes===null)enqueue(f);
  await Promise.all([...pending.values()].filter(x=>x.channel===channel.id).map(x=>x.promise));
 }
 const failed=evidence.files(g,channel.id).filter(f=>f.bytes===null);
 if(failed.length) {const error=Error(`${failed.length} ticketbijlage(n) konden niet veilig worden opgeslagen. Het ticket blijft behouden. Controleer de console en stel de bestanden veilig.`);error.ticketInput=true;throw error;}
}
function render(channel,maxBytes) {
 const g=channel.guildId||channel.guild.id;
 const messages=evidence.messages(g,channel.id);
 if(messages.length>5000)throw Error('Het ticketarchief bevat meer dan 5000 berichten; kanaal behouden voor handmatige export.');
 return view.render(channel,messages.map(m=>({...m,versions:evidence.versions(g,channel.id,m.message),files:evidence.files(g,channel.id,m.message)})),maxBytes);
}
async function backfill(channel) {
 let before,count=0;
 for(;;) {
  const batch=await channel.messages.fetch({limit:100,cache:false,...(before?{before}:{})});
  if(!batch.size)break;
  for(const m of batch.values()){capture(m);count++;}
  if(count>=5000) {logger.warn(`Ticketarchief opstartscan begrensd op 5000 berichten: ${channel.id}`);break;}
  const next=batch.last().id;if(before===next)break;before=next;
 }
 await flush(channel);
}
async function start(client) {
 let missing = 0;
 for(const entry of evidence.channels()) {
  try {
   const guild=client.guilds.cache.get(entry.guild);if(!guild)continue;
   const channel=await guild.channels.fetch(entry.channel);
   if (!channel) { missing++; continue; }
   if(channel.messages)await backfill(channel);
  } catch(error) {
   // A removed Discord channel is expected for historical tickets. Keep all evidence intact.
   if (Number(error.code) === 10003) { missing++; continue; }
   const name = String(client.guilds.cache.get(entry.guild)?.name || 'onbekend').replace(/[\r\n]/g, ' ');
   logger.warn(`Ticketarchief opstartscan ${name} (${entry.guild})/${entry.channel}: ${error.message}`);
  }
 }
 if (missing) logger.info(`Ticketarchief opstartscan: ${missing} niet meer bestaande kanaalverwijzing(en) overgeslagen; opgeslagen archief behouden.`);
}
module.exports={tracked,capture,deleted,observe,flush,render,start,backfill,validURL};
