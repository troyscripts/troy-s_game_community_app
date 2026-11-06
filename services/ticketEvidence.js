const { createHash } = require('node:crypto');
const evidence = require('../database/ticketEvidence');
const logger = require('../utils/logger');
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
 const payload={author:message.author?.tag||message.author?.username||'Onbekend',authorId:message.author?.id||'',
 content:message.content||'',edited:message.editedTimestamp||null,embeds:(message.embeds||[]).map(e=>e.toJSON?e.toJSON():e),attachments:files.map(f=>({id:f.id,name:f.name}))};
 const fingerprint=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
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
const escape = value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(channel,maxBytes) {
 const g=channel.guildId||channel.guild.id;
 const messages=evidence.messages(g,channel.id);
 if(messages.length>5000)throw Error('Het ticketarchief bevat meer dan 5000 berichten; kanaal behouden voor handmatige export.');
 let html=`<!doctype html><html lang="nl"><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:"><title>Ticketarchief ${escape(channel.name)}</title><style>body{background:#171a20;color:#edf0f5;font:15px system-ui;margin:32px;max-width:1100px}article{border:1px solid #454c58;padding:18px;margin:15px 0;border-radius:8px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}small{color:#aeb9ca}a{color:#8ecfff}.deleted{color:#ffab9c}section{border-left:3px solid #627792;padding-left:14px;margin:12px 0}</style><body><h1>${escape(channel.name)}</h1><p>Kanaal-ID: ${escape(channel.id)} · Export: ${new Date().toISOString()}</p><p>Bewaarde berichtgeschiedenis, inclusief ontvangen wijzigingen en verwijdermeldingen. Bijlagen hieronder zijn lokale kopieën in dit HTML-bestand. Gegevens die de bot niet heeft ontvangen, kunnen ontbreken.</p>`;
 for(const m of messages) {
  html+=`<article><small>${escape(m.message)} · ${new Date(m.created).toISOString()}</small>${m.deleted?`<p class="deleted"><b>VERWIJDERD BERICHT</b> · Verwijdering ontvangen: ${new Date(m.deleted).toISOString()}</p>`:''}`;
  const versions=evidence.versions(g,channel.id,m.message).sort((a,b)=>
   (JSON.parse(a.payload).edited||m.created)-(JSON.parse(b.payload).edited||m.created)||a.id-b.id);
  const changed=versions.length>1 || versions.some(v=>JSON.parse(v.payload).edited);
  if(changed)html+='<p><b>GEWIJZIGD BERICHT</b> — hieronder staan de bewaarde versies.</p>';
  if(versions.length===1 && JSON.parse(versions[0].payload).edited)html+='<p>De oorspronkelijke tekst vóór deze wijziging is niet door de bot ontvangen.</p>';
  const latest=versions.length?JSON.parse(versions.at(-1).payload):null;
  if(!versions.length)html+='<p>Inhoud niet ontvangen voordat het bericht werd verwijderd.</p>';
  versions.forEach((v,index)=>{
   const p=JSON.parse(v.payload);
   html+=`<section><p><b>${index===0?'Eerst bewaarde versie':'Gewijzigde versie '+(index+1)}</b>${p.edited?' · Wijziging: '+new Date(p.edited).toISOString():''}</p><b>${escape(p.author)}</b> <small>(${escape(p.authorId)}) · Waargenomen versie ${index+1} · ${new Date(v.observed).toISOString()}${p.edited?' · gewijzigd':''}</small><pre>${escape(p.content)}</pre>`;
   for(const embed of p.embeds)html+=`<pre>${escape(JSON.stringify(embed,null,2))}</pre>`;
   if(p.attachments.length)html+=`<p>Bijlagen in deze versie: ${p.attachments.map(a=>escape(a.name)).join(', ')}</p>`;
   html+='</section>';
  });
  for(const f of evidence.files(g,channel.id,m.message)) {
   if(f.bytes===null)throw Error('Bijlage ontbreekt in bewijsarchief; ticket behouden.');
   // Check before base64 allocation; browsers download inert octet-stream files.
   if(Buffer.byteLength(html)+Math.ceil(f.bytes.length/3)*4>maxBytes)throw Error('Transcript met bewaarde bijlagen is groter dan 8 MB. Ticket behouden; handmatige export vereist.');
   const removed=m.deleted || (latest && !latest.attachments.some(a=>a.id===f.attachment));
   html+=`<p>${removed?'<b class="deleted">VERWIJDERDE BIJLAGE</b> — ':''}<a download="${escape(f.name)}" href="data:application/octet-stream;base64,${f.bytes.toString('base64')}">Download bewaarde bijlage: ${escape(f.name)}</a> (${f.bytes.length} bytes)</p>`;
  }
  html+='</article>';
  if(Buffer.byteLength(html)>maxBytes)throw Error('Ticketarchief groter dan 8 MB; ticket behouden voor handmatige export.');
 }
 return Buffer.from(html+'</body></html>');
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
 for(const entry of evidence.channels()) {
  try {
   const guild=client.guilds.cache.get(entry.guild);if(!guild)continue;
   const channel=await guild.channels.fetch(entry.channel);
   if(channel?.messages)await backfill(channel);
  } catch(error) {logger.warn(`Ticketarchief opstartscan ${entry.guild}/${entry.channel}: ${error.message}`);}
 }
}
module.exports={tracked,capture,deleted,observe,flush,render,start,backfill,validURL};
