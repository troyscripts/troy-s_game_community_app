'use strict';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const raw = value => String(value ?? '');
const text = value => String(value ?? '').replace(/\\n/g,'\n');
function visible(payload) {
 return {
  content:raw(payload.content),
  embeds:(payload.embeds||[]).map(e=>({title:raw(e.title),description:raw(e.description),
   author:raw(e.author?.name),footer:raw(e.footer?.text),
   fields:(e.fields||[]).map(f=>({name:raw(f.name),value:raw(f.value)})),
   image:e.image?.url||'',thumbnail:e.thumbnail?.url||'',url:e.url||''})),
  attachments:(payload.attachments||[]).map(a=>({id:a.id,name:a.name})).sort((a,b)=>a.id.localeCompare(b.id))
 };
}
function versions(rows,created) {
 const sorted=rows.map(r=>({...r,data:JSON.parse(r.payload)})).sort((a,b)=>(a.data.edited||created)-(b.data.edited||created)||a.id-b.id);
 const result=[];
 for(const row of sorted) {
  const key=JSON.stringify(visible(row.data));
  if(result.at(-1)?.key===key) {result[result.length-1].lastObserved=row.observed;continue;}
  result.push({...row,key,lastObserved:row.observed});
 }
 return result;
}
function time(value,full=false) {
 const date=new Date(value);if(!Number.isFinite(date.getTime()))return 'Tijd onbekend';
 return new Intl.DateTimeFormat('nl-NL',{timeZone:'Europe/Amsterdam',...(full?{day:'2-digit',month:'2-digit',year:'numeric'}:{}),hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(date);
}
function namesFor(channel,messages) {
 const names={users:new Map(),roles:new Map(),channels:new Map()};
 for(const rows of messages)for(const row of rows) {
  const p=row.data;
  if(p.authorId)names.users.set(p.authorId,p.displayName||p.author);
  for(const type of ['users','roles','channels'])for(const [id,name]of Object.entries(p.names?.[type]||{}))names[type].set(id,name);
 }
 for(const [id,r]of channel.guild?.roles?.cache||[])names.roles.set(id,r.name);
 for(const [id,c]of channel.guild?.channels?.cache||[])names.channels.set(id,c.name);
 for(const [id,m]of channel.guild?.members?.cache||[])names.users.set(id,m.displayName||m.user?.globalName||m.user?.username);
 return names;
}
function markup(value,names) {
 const parts=raw(value).split(/(<@!?\d+>|<@&\d+>|<#\d+>)/g);
 return parts.map(part=>{
  const match=/^<(?:@(!?)(\d+)|@&(\d+)|#(\d+))>$/.exec(part);
  if(match) {
   const id=match[2]||match[3]||match[4],type=match[3]?'roles':match[4]?'channels':'users';
   const label=names[type].get(id)||(type==='roles'?'Onbekende rol':type==='channels'?'Onbekend kanaal':'Onbekende gebruiker');
   return `<span class="mention" title="ID: ${escape(id)}">${type==='channels'?'#':'@'}${escape(label)}</span>`;
  }
  return escape(part).replace(/`([^`\n]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
 }).join('');
}
function body(payload,names) {
 const rich=value=>markup(text(value),names);
 let html=payload.content?`<div class="content">${markup(payload.content,names)}</div>`:'';
 for(const e of payload.embeds||[]) {
  const color=Number.isInteger(e.color)&&e.color>=0&&e.color<=0xffffff?'#'+e.color.toString(16).padStart(6,'0'):'#6876de';
  html+=`<section class="embed" style="border-left-color:${color}">`;
  if(e.author?.name)html+=`<div class="embed-author">${rich(e.author.name)}</div>`;
  if(e.title)html+=`<h3>${rich(e.title)}</h3>`;
  if(e.description)html+=`<div>${rich(e.description)}</div>`;
  for(const f of e.fields||[])html+=`<div class="field"><strong>${rich(f.name)}</strong><div>${rich(f.value)}</div></div>`;
  if(e.image?.url||e.thumbnail?.url)html+='<p class="muted">Afbeelding uit een externe embed (geen opgeslagen bijlage).</p>';
  if(e.footer?.text||e.timestamp)html+=`<footer>${rich(e.footer?.text||'')}${e.timestamp?' · '+escape(time(e.timestamp,true)):''}</footer>`;
  html+='</section>';
 }
 return html||'<p class="muted">Geen tekst in deze berichtversie.</p>';
}
const css=`*{box-sizing:border-box}body{margin:0;background:#10141c;color:#e6eaf2;font:15px/1.65 system-ui,-apple-system,Segoe UI,sans-serif}.wrap{max-width:1000px;margin:auto;padding:40px 24px}header.page{border-bottom:1px solid #30394a;padding-bottom:24px;margin-bottom:28px}.eyebrow{color:#96a5c2;text-transform:uppercase;font-size:11px;letter-spacing:2px}h1{font-size:27px;line-height:1.3;overflow-wrap:anywhere;margin:8px 0 12px}.muted,small{color:#a0adc4}.stats{display:flex;gap:12px;flex-wrap:wrap;margin-top:20px}.stats span{background:#1c2433;border:1px solid #303b51;border-radius:7px;padding:5px 12px;font-size:13px}.day{font-size:13px;color:#abb9d0;text-align:center;margin:26px 0 12px}.message{display:flex;gap:14px;padding:20px;background:#191f2c;border:1px solid #303a4d;border-radius:10px;margin:12px 0}.message.deleted{border-left:4px solid #df827b}.avatar{display:flex;flex-shrink:0;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:#46598c;color:white;font-weight:700}.main{min-width:0;flex:1}.byline{display:flex;align-items:center;gap:9px;flex-wrap:wrap}.byline strong{font-size:15px}.byline time{font-size:12px;color:#a0adc4}.badge{font-size:10px;letter-spacing:.4px;border-radius:4px;padding:2px 6px;background:#3d334c;color:#e8c6ff}.badge.deleted{background:#4d292e;color:#ffbab3}.badge.edited{background:#45391e;color:#ffdc95}.badge.bot{background:#344a76;color:#c5d9ff}.content{margin:9px 0;white-space:normal;overflow-wrap:anywhere}.mention{background:#333c68;border-radius:4px;padding:1px 4px;color:#d7dfff}.embed{border-left:4px solid #6876de;padding:14px 18px;background:#121824;border-radius:5px;max-width:690px;margin-top:12px;overflow-wrap:anywhere}.embed h3{font-size:16px;margin:0 0 8px}.embed-author{font-size:12px;margin-bottom:6px}.field{margin:12px 0}.embed footer{font-size:11px;color:#a0adc4;margin-top:12px}details{margin-top:12px}summary{cursor:pointer;color:#bcc9e0;font-size:13px}details.technical{color:#a0adc4;font-size:12px}details.history{border-top:1px solid #343e52;padding-top:10px}.version{border-left:2px solid #627598;margin:14px 0 14px 4px;padding-left:14px}.version h4{font-size:12px;color:#c5d0e4;margin:0}.file{display:block;border:1px solid #384760;border-radius:6px;padding:9px 12px;margin-top:10px;background:#202a3b;overflow-wrap:anywhere}.file a{color:#b9d9ff;text-decoration:none}.file small{display:block}.file b{color:#ffbab3;font-size:11px}.notice{font-size:12px;color:#ffbab3;margin:8px 0}code{background:#10151f;padding:2px 5px;border-radius:4px}.fineprint{font-size:12px;color:#a0adc4;margin-top:28px}@media(max-width:600px){.wrap{padding:20px 12px}.message{padding:14px;gap:9px}.avatar{width:32px;height:32px}h1{font-size:22px}}`;
function render(channel,records,maxBytes) {
 const grouped=records.map(m=>({...m,versions:versions(m.versions,m.created)}));
 const names=namesFor(channel,grouped.map(m=>m.versions));
 const changed=m=>m.versions.length>1 || Boolean(m.versions[0]?.data.edited);
 let html=`<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:"><title>${escape(channel.name)} — Tickettranscript</title><style>${css}</style></head><body><main class="wrap"><header class="page"><div class="eyebrow">Tickettranscript · ${escape(channel.guild?.name||'Discord')}</div><h1>${escape(channel.name)}</h1><div class="muted">Gespreksarchief · tijden in Nederland (Europe/Amsterdam)</div><div class="stats"><span>${grouped.length} berichten</span><span>${grouped.filter(changed).length} gewijzigd</span><span>${grouped.filter(m=>m.deleted).length} verwijderd</span></div><details class="technical"><summary>Exportgegevens</summary>Kanaal-ID: ${escape(channel.id)}<br>Geëxporteerd: ${time(Date.now(),true)}</details></header>`;
 let previousDay='';
 for(const m of grouped) {
  const latest=m.versions.at(-1)?.data;
  const day=new Intl.DateTimeFormat('nl-NL',{timeZone:'Europe/Amsterdam',dateStyle:'long'}).format(new Date(m.created));
  if(day!==previousDay){html+=`<div class="day">${escape(day)}</div>`;previousDay=day;}
  const author=latest?.displayName||latest?.author||'Onbekende afzender';
  html+=`<article class="message${m.deleted?' deleted':''}"><div class="avatar" aria-hidden="true">${escape(author.slice(0,1).toUpperCase())}</div><div class="main"><div class="byline"><strong>${escape(author)}</strong>${latest?.bot?'<span class="badge bot">BOT</span>':''}<time>${time(m.created)}</time>${m.deleted?'<span class="badge deleted">VERWIJDERD BERICHT</span>':''}${changed(m)?'<span class="badge edited">GEWIJZIGD BERICHT</span>':''}</div>`;
  if(m.deleted)html+=`<p class="notice">Verwijdering ontvangen op ${time(m.deleted,true)}. Hieronder staat de laatst bewaarde inhoud.</p>`;
  html+=latest?body(latest,names):'<p class="muted">Inhoud niet ontvangen voordat het bericht werd verwijderd.</p>';
  if(m.versions.length>1) {
   html+=`<details class="history"><summary>Wijzigingsgeschiedenis bekijken · ${m.versions.length} versies</summary>`;
   m.versions.forEach((v,index)=>{
    html+=`<div class="version"><h4>${index===0?'Eerst bewaarde versie':index===m.versions.length-1?'Laatst bewaarde versie':'Gewijzigde versie '+(index+1)} · ${time(v.data.edited||v.observed,true)}</h4>${body(v.data,names)}`;
    if(v.data.attachments?.length)html+=`<small>Bijlagen in deze versie: ${v.data.attachments.map(a=>escape(a.name)).join(', ')}</small>`;
    html+='</div>';
   });
   html+='</details>';
  } else if(latest?.edited)html+='<p class="muted">De oorspronkelijke tekst vóór deze wijziging is niet door de bot ontvangen.</p>';
  for(const f of m.files) {
   if(f.bytes===null)throw Error('Bijlage ontbreekt in bewijsarchief; ticket behouden.');
   if(Buffer.byteLength(html)+Math.ceil(f.bytes.length/3)*4>maxBytes)throw Error('Transcript met bewaarde bijlagen is groter dan 8 MB. Ticket behouden; handmatige export vereist.');
   const removed=m.deleted||(latest&&!latest.attachments?.some(a=>a.id===f.attachment));
   html+=`<div class="file">${removed?'<b>VERWIJDERDE BIJLAGE</b><br>':''}<a download="${escape(f.name)}" href="data:application/octet-stream;base64,${f.bytes.toString('base64')}">↓ ${escape(f.name)}</a><small>${(f.bytes.length/1024).toLocaleString('nl-NL',{maximumFractionDigits:1})} KB · Opgeslagen kopie</small></div>`;
  }
  html+=`<details class="technical"><summary>Berichtgegevens</summary>Bericht-ID: ${escape(m.message)}<br>Gebruiker-ID: ${escape(latest?.authorId||'Onbekend')}<br>Verstuurd: ${escape(new Date(m.created).toISOString())}${m.deleted?'<br>Verwijdering ontvangen: '+escape(new Date(m.deleted).toISOString()):''}</details></div></article>`;
  if(Buffer.byteLength(html)>maxBytes)throw Error('Ticketarchief groter dan 8 MB; ticket behouden voor handmatige export.');
 }
 html+='<p class="fineprint">Dit archief bevat wat de bot heeft ontvangen. Verwijderen uit Discord verwijdert eerder opgeslagen inhoud niet. Een verwijdermarkering vermeldt niet wie het bericht heeft verwijderd. Oudere versies zijn uitklapbaar; bijlagen zitten als downloadbare kopie in dit bestand.</p></main></body></html>';
 if(Buffer.byteLength(html)>maxBytes)throw Error('Ticketarchief groter dan 8 MB; ticket behouden voor handmatige export.');
 return Buffer.from(html);
}
module.exports={visible,versions,render,escape};
