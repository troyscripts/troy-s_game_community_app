'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'troy-softmod-'));
const defaults=require('../config/defaults');defaults.Database.File=path.join(tmp,'test.sqlite');defaults.Logging.Files=false;
const database=require('../database/database');database.initializeDatabase();
const settings=require('../database/guildSettings');settings.initialize();
const groq=require('../services/groqConnection');let ai='violation',requests=0,category='adult',lastRequest;
groq.requestChat=async options=>{requests++;lastRequest=options;if(ai==='error')throw Error('provider down');return {message:{content:JSON.stringify({verdict:ai,confidence:0.98,reason:'Testclassificatie',category})}};};
const service=require('../services/softModeration'),cases=require('../database/softModeration');
const {parseEnd,isStaff}=require('../services/softModerationRules');
const {PermissionsBitField,PermissionFlagsBits:P}=require('discord.js');
const g='111111111111111111',u='222222222222222222',c='333333333333333333',l='444444444444444444',staff='555555555555555555',b='666666666666666666',role='777777777777777777';
let seq=800000000000000000n,timeoutCalls=0,replyCalls=0;
const perms=new PermissionsBitField([P.ViewChannel,P.SendMessages,P.EmbedLinks,P.ReadMessageHistory,P.ModerateMembers,P.ManageMessages]);
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
 channel.permissionsFor=()=>perms;
 let publicWarnings=0,dmWarnings=0,deleted=0;
 channel.send=async()=>{publicWarnings++;};
 const warnings=require('../database/warnings');
 const make=(extra={})=>msg({author:{id:u,bot:false,send:async()=>{dmWarnings++;}},delete:async()=>{deleted++;},...extra});
 const first=make();await service.processMessage(first);let row=cases.get(first.id);
 assert.equal(deleted,1);assert.equal(dmWarnings,1);assert.equal(row.action,'adult_warning');assert.ok(row.warningId);
 assert.equal(warnings.getWarnings(u,g).length,1);assert.equal(row.content.includes(first.content),false);
 await service.processMessage(first);assert.equal(deleted,1);assert.equal(warnings.getWarnings(u,g).length,1);
 await service.button(client,interaction(row,'reject'));assert.equal(warnings.getWarnings(u,g).length,0);
 const image=make({content:'',attachments:new Map([['photo',{id:'photo',name:'test.png',contentType:'image/png',size:100,url:'https://cdn.discordapp.com/attachments/1/2/test.png'}]])});
 await service.processMessage(image);assert.equal(lastRequest.model,settings.getGuildConfig(g).SoftModeration.VisionModel);
 assert.equal(lastRequest.messages[1].content[1].type,'image_url');assert.equal(deleted,2);
 const denied=make({delete:async()=>{throw Object.assign(Error('No permission'),{code:50013});}});
 await service.processMessage(denied);assert.equal(cases.get(denied.id).action,'adult_failed');assert.equal(warnings.getWarnings(u,g).length,1);
 const blocked=make({author:{id:u,bot:false,send:async()=>{throw Error('DM blocked');}}});await service.processMessage(blocked);assert.equal(publicWarnings,1);
 ai='review';const uncertain=make();await service.processMessage(uncertain);assert.equal(cases.get(uncertain.id).action,'review');const count=deleted;
 ai='ok';category='other';const video=make({content:'',attachments:new Map([['video',{name:'test.mp4',contentType:'video/mp4',size:100,url:'https://cdn.discordapp.com/attachments/1/2/test.mp4'}]])});
 await service.processMessage(video);assert.equal(cases.get(video.id).action,'review');assert.equal(deleted,count);
 ai='error';const unavailable=make();await assert.rejects(service.processMessage(unavailable));assert.equal(deleted,count);assert.equal(cases.get(unavailable.id),null);
 settings.updateValue(g,'SoftModeration.AdultContent','nee');assert.equal(service.eligible(image,settings.getGuildConfig(g)),false);
 console.log('PASS adult moderation: text/image dispatch, registered single warn, staff rejection, delete failure, DM fallback, unsupported video review, uncertain verdict and API failure.');
}
run().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{database.closeDatabase();fs.rmSync(tmp,{recursive:true,force:true});});
