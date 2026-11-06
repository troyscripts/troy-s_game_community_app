const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ticket-evidence-'));
const config=require('../config/defaults');config.Database.File=path.join(tmp,'test.sqlite');config.Logging.Enabled=false;
const {db}=require('../database/database');
const store=require('../database/tickets');
store.ensureTicketSchema();
const gov=require('../database/governmentTickets');
const archive=require('../services/ticketEvidence');
const evidence=require('../database/ticketEvidence');
const {Collection}=require('discord.js');
store.createTicket({guildId:'g',userId:'owner',channelId:'ticket'});
store.setStaffThread('ticket','staff-thread',[]);
gov.add({guild:'g',channel:'government',service:'politie',department:'0',owner:'owner',access:'{}'});
const channel={id:'ticket',name:'ticket-test',parentId:'original-category',guild:{id:'g'}};
const attachment={id:'a',name:'bewijs.txt',size:6,url:'https://cdn.discordapp.com/attachments/test/file.txt'};
const message=(overrides={})=>({id:'message',guildId:'g',channelId:'ticket',createdTimestamp:1000,editedTimestamp:null,author:{id:'owner',username:'Troy'},content:'oorspronkelijk <script>gevaar</script>',attachments:new Collection([['a',attachment]]),embeds:[],...overrides});
let downloads=0;
const originalFetch=global.fetch;
global.fetch=async url=>{downloads++;assert.match(url,/cdn.discordapp.com/);return new Response(Buffer.from('bewijs'));};
(async()=>{
 archive.capture(message());await archive.flush(channel);
 assert.equal(downloads,1);
 // Moving across categories never changes identity or tracking.
 channel.parentId='other-category';assert.equal(archive.tracked(channel),true);
 archive.capture(message({content:'gewijzigd bericht',editedTimestamp:2000,attachments:new Collection()}));
 archive.deleted(message({partial:true,createdTimestamp:1000}));
 const html=archive.render(channel,8*1024*1024).toString();
 assert.match(html,/GEWIJZIGD BERICHT/);assert.match(html,/VERWIJDERD BERICHT/);assert.match(html,/VERWIJDERDE BIJLAGE/);
 assert.match(html,/oorspronkelijk &lt;script&gt;gevaar&lt;\/script&gt;/);assert.match(html,/gewijzigd bericht/);
 assert.match(html,/YmV3aWpz/);assert.match(html,/download="bewijs.txt"/);assert.doesNotMatch(html,/<script>/);
 assert.equal(evidence.versions('g','ticket','message').length,2);
 archive.capture(message({content:'gewijzigd bericht',editedTimestamp:2000,attachments:new Collection()}));
 assert.equal(evidence.versions('g','ticket','message').length,2,'Repeated snapshots are deduplicated');
 archive.observe(message({id:'bulk',partial:true}),true);assert.match(archive.render(channel,8*1024*1024).toString(),/Inhoud niet ontvangen/);
 assert.equal(archive.capture(message({guildId:'other'})),false);
 assert.equal(archive.capture(message({channelId:'ordinary-chat'})),false);
 archive.capture(message({id:'staff',channelId:'staff-thread',content:'SECRET STAFF',attachments:new Collection()}));
 assert.doesNotMatch(archive.render(channel,8*1024*1024).toString(),/SECRET STAFF/);
 assert.match(archive.render({id:'staff-thread',name:'staff',guild:{id:'g'}},8*1024*1024).toString(),/SECRET STAFF/);
 archive.capture(message({channelId:'government',id:'gov',content:'Government',attachments:new Collection()}));
 assert.equal(evidence.messages('g','government').length,1);
 assert.throws(()=>archive.validURL('http://127.0.0.1/private'),/toegestane/);
 assert.throws(()=>archive.validURL('https://example.com/file'),/toegestane/);
 assert.throws(()=>archive.render(channel,20),/groter/);
 // The final transcript merges deleted evidence even when Discord history is empty.
 const bounded=require('../services/boundedTranscript');
 channel.messages={fetch:async()=>new Collection()};
 const output=await bounded.createTranscript(channel,{returnType:'buffer'});
 assert.match(output.toString(),/VERWIJDERD BERICHT/);assert.match(output.toString(),/YmV3aWpz/);
 // A failed attachment capture prevents export/deletion, then a successful retry restores it.
 global.fetch=async()=>new Response('',{status:404});
 archive.capture(message({id:'failed',attachments:new Collection([['b',{...attachment,id:'b'}]])}));
 await assert.rejects(archive.flush(channel),/konden niet veilig/);
 await assert.rejects(bounded.createTranscript(channel,{returnType:'buffer'}),/konden niet veilig/);
 global.fetch=async()=>new Response(Buffer.from('bewijs'));
 await archive.flush(channel,true);
 assert.ok(evidence.file('g','ticket','failed','b').bytes);
 // Restart the archive module; persisted versions, deletion flag and file bytes remain.
 delete require.cache[require.resolve('../services/ticketEvidence')];
 const restarted=require('../services/ticketEvidence');
 assert.match(restarted.render(channel,8*1024*1024).toString(),/VERWIJDERD BERICHT/);
 assert.match(restarted.render(channel,8*1024*1024).toString(),/YmV3aWpz/);
 // Existing open tickets are backfilled from visible history.
 let page=0;channel.messages.fetch=async()=>page++?new Collection():new Collection([['historic',message({id:'historic',content:'zichtbaar oud bericht',attachments:new Collection()})]]);
 await restarted.backfill(channel);assert.match(restarted.render(channel,8*1024*1024).toString(),/zichtbaar oud bericht/);
 console.log('PASS: persistent originals/edits/deletions, removed file bytes, category moves, main/government/staff isolation, safe HTML, deduplication, restart, backfill, download failures/retry and merged export.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{global.fetch=originalFetch;db.close();fs.rmSync(tmp,{recursive:true,force:true});});
