'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'troy-softmod-'));
const defaults=require('../config/defaults');defaults.Database.File=path.join(tmp,'test.sqlite');defaults.Logging.Files=false;
const database=require('../database/database');database.initializeDatabase();
const settings=require('../database/guildSettings');settings.initialize();
const groq=require('../services/groqConnection');let ai='violation',requests=0;
groq.requestChat=async()=>{requests++;if(ai==='error')throw Error('provider down');return {message:{content:JSON.stringify({verdict:ai,confidence:0.98,reason:'Gerichte belediging'})}};};
const service=require('../services/softModeration'),cases=require('../database/softModeration');
const {parseEnd,isStaff}=require('../services/softModerationRules');
const {PermissionsBitField,PermissionFlagsBits:P}=require('discord.js');
const g='111111111111111111',u='222222222222222222',c='333333333333333333',l='444444444444444444',staff='555555555555555555',b='666666666666666666',role='777777777777777777';
let seq=800000000000000000n,timeoutCalls=0,replyCalls=0;
const perms=new PermissionsBitField([P.ViewChannel,P.SendMessages,P.EmbedLinks,P.ReadMessageHistory,P.ModerateMembers]);
const target={id:u,permissions:new PermissionsBitField(),roles:{cache:new Map(),highest:{}},moderatable:true,communicationDisabledUntilTimestamp:null,
 async disableCommunicationUntil(t){timeoutCalls++;this.communicationDisabledUntilTimestamp=t;}};
const actor={id:staff,permissions:perms,roles:{cache:new Map([[role,{}]]),highest:{comparePositionTo:()=>1}}};
const client={user:{id:b}};
const guild={id:g,ownerId:'999999999999999999',client,members:{fetchMe:async()=>({permissions:perms}),fetch:async({user})=>user===staff?actor:target},channels:{fetch:async id=>id===l?log:channel}};
actor.guild=target.guild=guild;
const logs=new Map(),messages=new Map();
const log={id:l,guild,isTextBased:()=>true,permissionsFor:()=>perms,messages:{fetch:async id=>logs.get(id)},async send(payload){
 const message={id:String(++seq),author:{id:b},payload,async edit(p){this.payload=p;}};logs.set(message.id,message);return message;}};
const channel={id:c,guild,messages:{cache:messages,fetch:async arg=>{const m=messages.get(arg.message||arg);if(!m)throw Error('deleted');return m;}}};
function msg(extra={}){const m={id:String(++seq),guild,channel,channelId:c,author:{id:u,bot:false},member:target,content:'message '+seq,createdTimestamp:Date.now(),mentions:{users:new Map(),roles:new Map()},
 async reply(){replyCalls++;},...extra};messages.set(m.id,m);return m;}
function interaction(row,action,extra={}) {return {guild,guildId:g,channelId:l,user:{id:staff},member:actor,customId:`softmod:${action}:${row.id}`,message:logs.get(row.logMessage),
 async deferReply(){this.deferred=true;},async reply(p){this.response=p;},async editReply(p){this.response=p;},async showModal(p){this.modal=p;},...extra};}
async function run(){
 settings.ensureGuild(g);settings.updateValue(g,'SoftModeration.Enabled','ja');settings.updateValue(g,'SoftModeration.LogChannel',l);settings.updateValue(g,'StaffRoles',role);
 const cfg=settings.getGuildConfig(g);assert.equal(cfg.SoftModeration.TimeoutHours,24);assert.equal(settings.getGuildConfig('other').SoftModeration.Enabled,false);
 assert.throws(()=>settings.updateValue(g,'SoftModeration.TimeoutHours','673'));assert.throws(()=>settings.updateValue(g,'SoftModeration.MinConfidence','0.1'));
 assert.equal(isStaff(actor,cfg),true);assert.equal(service.eligible(msg({member:actor}),cfg),false);
 assert.equal(service.eligible(msg({author:{id:u,bot:true}}),cfg),false);
 // First violation warns, duplicates never count twice.
 const first=msg();assert.equal(await service.processMessage(first),true);let row=cases.get(first.id);
 assert.equal(row.action,'warning');assert.equal(replyCalls,1);assert.equal(timeoutCalls,0);
 await service.processMessage(first);assert.equal(replyCalls,1);
 assert.ok(logs.get(row.logMessage).payload.components[0].components[0].url.endsWith('/'+first.id));
 // A subsequent incident, after the warning, receives precisely 24 hours.
 const second=msg({createdTimestamp:row.notified+1});const before=Date.now();await service.processMessage(second);row=cases.get(second.id);
 assert.equal(row.action,'timeout');assert.equal(timeoutCalls,1);assert.ok(row.until>=before+86400000 && row.until<=Date.now()+86400000);
 // Authorized review, durable revision and modal end-time editing.
 await service.button(client,interaction(row,'approve'));row=cases.get(row.id);assert.equal(row.status,'approved');
 const open=interaction(row,'time');await service.button(client,open);assert.ok(open.modal);
 const endText=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Amsterdam',dateStyle:'short',timeStyle:'short'}).format(Date.now()+2*86400000).replaceAll('/','-').replace(',','');
 const edit=interaction(row,'end',{customId:open.modal.data.custom_id,fields:{getTextInputValue:()=>endText}});
 await service.modal(client,edit);assert.match(edit.response.content,/aangepast/);row=cases.get(row.id);assert.equal(row.until,parseEnd(endText));
 await service.modal(client,edit);assert.match(edit.response.content,/gewijzigd/);
 // Another staff timeout is preserved when this case is rejected.
 target.communicationDisabledUntilTimestamp=row.until+60000;const external=target.communicationDisabledUntilTimestamp;
 await service.button(client,interaction(row,'reject'));assert.equal(target.communicationDisabledUntilTimestamp,external);assert.equal(cases.get(row.id).counts,false);
 const count=timeoutCalls;await service.button(client,interaction(row,'reject'));assert.equal(timeoutCalls,count);
 // Exact matching owned timeout is removed; forged/cross-server controls do nothing.
 target.communicationDisabledUntilTimestamp=null;
 const third=msg({createdTimestamp:Date.now()+100});await service.processMessage(third);row=cases.get(third.id);assert.equal(row.action,'timeout');
 const forged=interaction(row,'reject',{guildId:'other'});await service.button(client,forged);assert.equal(cases.get(row.id).status,'pending');
 actor.roles.highest.comparePositionTo=()=>-1;await service.button(client,interaction(row,'reject'));assert.equal(cases.get(row.id).status,'pending');actor.roles.highest.comparePositionTo=()=>1;
 await service.button(client,interaction(row,'reject'));assert.equal(target.communicationDisabledUntilTimestamp,null);
 // Reject first warning: it can no longer trigger escalation. No channel exclusions, even staff channel.
 await service.button(client,interaction(cases.get(first.id),'reject'));
 ai='review';const uncertain=msg({createdTimestamp:Date.now()+150});await service.processMessage(uncertain);assert.equal(cases.get(uncertain.id).counts,false);
 ai='violation';const ordinary=msg({createdTimestamp:Date.now()+200});await service.processMessage(ordinary);assert.equal(cases.get(ordinary.id).action,'warning');
 target.roles.cache.set(role,{});const exempt=msg();const n=requests;await service.processMessage(exempt);assert.equal(requests,n);target.roles.cache.clear();
 ai='error';const outage=msg(); // Avoid flood rules for this provider-failure check.
 outage.author={id:'121212121212121212',bot:false};
 await assert.rejects(service.processMessage(outage));assert.equal(cases.get(outage.id),null);
 // Failed staff delivery must not apply any automatic penalty.
 ai='violation';const originalSend=log.send;log.send=async()=>{throw Error('Missing access');};
 const noLog=msg({author:{id:'131313131313131313',bot:false}});const sanctions=timeoutCalls;
 await assert.rejects(service.processMessage(noLog));assert.equal(cases.get(noLog.id),null);assert.equal(timeoutCalls,sanctions);log.send=originalSend;
 // A staff role assigned while a queued message still has an old member snapshot is respected.
 target.roles.cache.set(role,{});const queuedStaff=msg({member:{id:u,roles:{cache:new Map()}}});
 assert.equal(await service.processMessage(queuedStaff),false);assert.equal(cases.get(queuedStaff.id),null);target.roles.cache.clear();
 // Both approved and rejected cases survive process reload; old pre-warning messages do not escalate.
 const burst=msg({createdTimestamp:keepTime()});
 function keepTime(){return cases.get(ordinary.id).notified-1;}
 assert.equal(await service.processMessage(burst),false);assert.equal(cases.get(burst.id),null);
 // A provider timeout/failure has no case and no sanction; existing timeout remains untouched.
 assert.equal(timeoutCalls,sanctions);
 // Strict Amsterdam time validation including both DST edge cases.
 assert.equal(parseEnd('23-10-2026 20:00',Date.parse('2026-10-22T00:00Z')),Date.parse('2026-10-23T18:00Z'));
 assert.throws(()=>parseEnd('25-10-2026 02:30',Date.parse('2026-10-22T00:00Z')));
 assert.throws(()=>parseEnd('29-03-2026 02:30',Date.parse('2026-03-20T00:00Z')));
 assert.throws(()=>parseEnd('31-02-2026 12:00',Date.parse('2026-02-20T00:00Z')));
 assert.throws(()=>parseEnd('23-12-2026 20:00',Date.parse('2026-10-22T00:00Z')));
 // Records persist independently of economy reset and module reload.
 const keep=cases.get(ordinary.id);require('../database/economyReset').resetEconomy(g);assert.deepEqual(cases.get(ordinary.id),keep);
 delete require.cache[require.resolve('../database/softModeration')];assert.deepEqual(require('../database/softModeration').get(ordinary.id),keep);
 console.log('PASS softmod: warning, 24h escalation, staff exemption, review, reject/undo, exact ownership, forged/stale controls, hierarchy, modal, DST, AI failure, persistence and config isolation.');
}
run().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{database.closeDatabase();fs.rmSync(tmp,{recursive:true,force:true});});
