'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'troy-honeypot-'));
const defaults=require('../config/defaults');defaults.Database.File=path.join(tmp,'test.sqlite');defaults.Logging.Enabled=false;
const database=require('../database/database');database.initializeDatabase();
const settings=require('../database/guildSettings');settings.initialize();
const service=require('../services/honeypot'),cases=require('../database/honeypot');
const {PermissionFlagsBits:P,PermissionsBitField}=require('discord.js');
const g='111111111111111111',u='222222222222222222',channelId='333333333333333333',logId='444444444444444444',moderator='555555555555555555',bot='666666666666666666';
let seq=700000000000000000n,banCalls=0,timeoutCalls=0,unbanCalls=0,logs=[],edits=[],banState=null;
const permissions=new PermissionsBitField([P.BanMembers,P.ModerateMembers]);
const actor={id:moderator,permissions,roles:{highest:{comparePositionTo:()=>1}}};
const member={id:u,bannable:true,moderatable:true,communicationDisabledUntilTimestamp:null,roles:{highest:{}},
 async ban(options){banCalls++;banState={reason:options.reason};},
 async disableCommunicationUntil(time){timeoutCalls++;this.communicationDisabledUntilTimestamp=time;}};
const guild={id:g,ownerId:'999999999999999999',members:{
 fetchMe:async()=>({permissions}),fetch:async options=>options.user===moderator?actor:member,
 unban:async()=>{unbanCalls++;banState=null;}},bans:{fetch:async()=>{if(!banState)throw Object.assign(Error('Unknown ban'),{code:10026});return banState;}},channels:{fetch:async()=>log}};
const log={id:logId,guild,isTextBased:()=>true,send:async payload=>{logs.push(payload);return {id:String(++seq)};}};
function msg(extra={}){return {id:String(++seq),guild,channelId,channel:{id:channelId,isThread:()=>false},author:{id:u,bot:false},content:'',attachments:new Map([['image',{}]]),...extra};}
function interaction(row,extra={}) {return {guild,guildId:g,channelId:logId,user:{id:moderator},customId:'honeypot:'+row.id,
 message:{id:row.log_message,author:{id:bot},guild,async edit(p){edits.push(p);}},
 async deferReply(p){assert.equal(p.flags,64);this.deferred=true;this.ephemeral=true;},async editReply(p){this.response=p;},...extra};}
async function run(){
 settings.ensureGuild(g);settings.ensureGuild('888888888888888888');
 assert.equal(settings.getGuildConfig(g).Honeypot.Enabled,false);
 assert.equal(await service.handleMessage(msg()),false);
 assert.throws(()=>settings.updateValue(g,'Honeypot.Action','kick'));
 assert.throws(()=>settings.updateValue(g,'Honeypot.Channel','invalid'));
 settings.updateValue(g,'Honeypot.Channel',`<#${channelId}>`);settings.updateValue(g,'Logging.Channel',logId);settings.updateValue(g,'Honeypot.Enabled','ja');
 assert.equal(settings.getGuildConfig('888888888888888888').Honeypot.Enabled,false);
 assert.equal(await service.handleMessage(msg({channelId:'888888888888888888'})),false);
 assert.equal(await service.handleMessage(msg({author:{id:u,bot:true}})),false);
 assert.equal(await service.handleMessage(msg({webhookId:'webhook'})),false);
 const m=msg();await Promise.all([service.handleMessage(m),service.handleMessage(m)]);assert.equal(banCalls,1);
 let row=cases.get(m.id);assert.equal(row.status,'active');assert.equal(logs.length,1);assert.equal(row.log_channel,logId);
 assert.equal(logs[0].components[0].components[0].custom_id,'honeypot:'+m.id);
 const forged=interaction(row,{guildId:'888888888888888888'});await service.undo({user:{id:bot}},forged);assert.equal(unbanCalls,0);
 permissions.remove(P.BanMembers);await service.undo({user:{id:bot}},interaction(row));assert.equal(unbanCalls,0);permissions.add(P.BanMembers);
 banState.reason='Later manual ban';await service.undo({user:{id:bot}},interaction(row));assert.equal(unbanCalls,0);
 banState.reason=row.reason;await Promise.all([service.undo({user:{id:bot}},interaction(row)),service.undo({user:{id:bot}},interaction(row))]);assert.equal(unbanCalls,1);assert.equal(cases.get(row.id).status,'resolved');assert.deepEqual(edits[0].components,[]);
 settings.updateValue(g,'Honeypot.Action','timeout');settings.updateValue(g,'Honeypot.LogChannel',logId);
 const t=msg({content:'hello'}),before=Date.now();await service.handleMessage(t);row=cases.get(t.id);
 assert.equal(row.status,'active');assert.ok(row.timeout_until>=before+service.WEEK);assert.ok(row.timeout_until<=Date.now()+service.WEEK);assert.equal(timeoutCalls,1);
 const duplicate=msg();await service.handleMessage(duplicate);assert.equal(timeoutCalls,1);assert.equal(cases.get(duplicate.id).status,'failed');
 member.communicationDisabledUntilTimestamp+=60000;await service.undo({user:{id:bot}},interaction(row));assert.equal(timeoutCalls,1);
 member.communicationDisabledUntilTimestamp=row.timeout_until;actor.roles.highest.comparePositionTo=()=>-1;await service.undo({user:{id:bot}},interaction(row));assert.equal(timeoutCalls,1);
 actor.roles.highest.comparePositionTo=()=>1;await service.undo({user:{id:bot}},interaction(row));assert.equal(timeoutCalls,2);assert.equal(member.communicationDisabledUntilTimestamp,null);
 const th=msg({channelId:'888888888888888888',channel:{isThread:()=>true,parentId:channelId}});await service.handleMessage(th);assert.equal(cases.get(th.id).status,'active');
 member.communicationDisabledUntilTimestamp=null;member.moderatable=false;const failure=msg();await service.handleMessage(failure);assert.equal(cases.get(failure.id).status,'failed');assert.deepEqual(logs.at(-1).components,[]);member.moderatable=true;
 // A log delivery failure cannot roll back a successfully applied punishment.
 const oldSend=log.send;log.send=async()=>{throw Error('Missing access');};const noLog=msg();await service.handleMessage(noLog);assert.equal(cases.get(noLog.id).status,'active');log.send=oldSend;
 // Persistent cases are available after restart; resets do not delete moderation records.
 const persisted=cases.get(t.id);require('../database/economyReset').resetEconomy(g);assert.deepEqual(cases.get(t.id),persisted);
 database.db.pragma('wal_checkpoint(FULL)');const disk=new (require('better-sqlite3'))(defaults.Database.File);assert.equal(disk.prepare('SELECT status FROM honeypot_cases WHERE id=?').get(t.id).status,'resolved');disk.close();
 assert.ok(settings.getEditablePaths().includes('Honeypot.Action'));
 const source=fs.readFileSync(path.join(__dirname,'../events/messageCreate.js'),'utf8');assert.ok(source.indexOf('.handleMessage(message)')<source.indexOf('const countingResult'));
 // Automatic bilingual warning, mentions, edits and restart-safe persistence.
 const warnings=require('../services/honeypotWarning');
 const notices=new Map();let posts=0,updates=0,lastPayload;
 guild.client={user:{id:bot}};
 guild.roles={fetch:async id=>({id})};
 const warningChannel={id:channelId,isTextBased:()=>true,messages:{fetch:async id=>{if(!notices.has(id))throw Object.assign(Error('Unknown Message'),{code:10008});return notices.get(id);}},
   async send(payload){posts++;lastPayload=payload;const m={id:String(++seq),content:payload.content,author:{id:bot},async edit(p){updates++;lastPayload=p;this.content=p.content;}};notices.set(m.id,m);return m;}};
 guild.channels.fetch=async id=>id===channelId?warningChannel:log;
 settings.updateValue(g,'Roles.Verified',moderator);settings.updateValue(g,'Honeypot.Action','ban');
 await Promise.all([warnings.syncWarning(guild),warnings.syncWarning(guild)]);assert.equal(posts,1);
 assert.match(lastPayload.content,/permanente ban/);assert.match(lastPayload.content,/permanent ban/);
 assert.ok(lastPayload.content.endsWith('<@&'+moderator+'>'));assert.deepEqual(lastPayload.allowedMentions.roles,[moderator]);
 assert.ok(lastPayload.content.length<=2000);
 await warnings.syncWarning(guild);assert.equal(posts,1);assert.equal(updates,0);
 settings.updateValue(g,'Honeypot.Action','timeout');await warnings.syncWarning(guild);assert.equal(updates,1);assert.match(lastPayload.content,/7-day timeout/);assert.deepEqual(lastPayload.allowedMentions,{parse:[]});
 settings.updateValue(g,'Honeypot.Mention','@everyone');await warnings.syncWarning(guild);assert.ok(lastPayload.content.endsWith('@everyone'));assert.deepEqual(lastPayload.allowedMentions,{parse:[]});
 settings.updateValue(g,'Honeypot.Mention','<@&'+moderator+'>');assert.equal(settings.getGuildConfig(g).Honeypot.Mention,moderator);
 assert.throws(()=>settings.updateValue(g,'Honeypot.Mention','random text'));
 settings.updateValue(g,'Honeypot.Mention','none');await warnings.syncWarning(guild);assert.ok(!lastPayload.content.includes('🔔'));
 notices.clear();await warnings.syncWarning(guild);assert.equal(posts,2);assert.deepEqual(lastPayload.allowedMentions,{parse:[]});
 settings.updateValue(g,'Honeypot.Enabled','nee');await warnings.syncWarning(guild);assert.equal(lastPayload.content,warnings.INACTIVE);assert.equal(posts,2);
 settings.updateValue(g,'Honeypot.Enabled','ja');await warnings.syncWarning(guild);assert.equal(posts,2);assert.match(lastPayload.content,/WAARSCHUWING/);
 const choice=await warnings.mentionChoice(guild,{Honeypot:{Mention:'here'}});assert.equal(choice.text,'@here');assert.deepEqual(choice.allowed,{parse:['everyone']});
 console.log('PASS: bilingual automatic warnings, configurable mentions, no duplicate/repeated ping, updates, disable/reactivate and deleted-message repair.');
 console.log('PASS: config validation/isolation, text and attachment trigger, thread, bot/webhook exclusion, duplicate events, ban, seven-day timeout, log failure, durable buttons, authorization, hierarchy, changed penalties, duplicate clicks, resets and persistence.');
}
run().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{database.closeDatabase();fs.rmSync(tmp,{recursive:true,force:true});});
