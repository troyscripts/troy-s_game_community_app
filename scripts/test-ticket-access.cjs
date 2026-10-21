'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'troy-ticket-access-'));
const config=require('../config/defaults');config.Database.File=path.join(tmp,'test.sqlite');config.Logging.Enabled=false;
const db=require('../database/database');db.initializeDatabase();
const tickets=require('../database/tickets'),access=require('../services/ticketAccess');
const {Collection,PermissionsBitField:B,PermissionFlagsBits:P,ChannelType}=require('discord.js');
const role=(id,position)=>({id,position,managed:false,comparePositionTo(other){return this.position-other.position;}});
const roles=new Collection([['g',role('g',0)],['low',role('low',10)],['high',role('high',20)],['top',role('top',30)],['guest',role('guest',2)],['below-panel',role('below-panel',1)]]);
config.StaffRoles=['low','high','top','below-panel'];
const members=new Collection();
const guild={id:'g',ownerId:'server-owner',roles:{cache:roles,fetch:async()=>roles},members:{fetch:async o=>o?members.get(typeof o==='string'?o:o.user):members,fetchMe:async()=>members.get('bot')},channels:{fetch:async()=>null}};
function member(id,ids=[],admin=false){const m={id,guild,user:{bot:id==='bot'},roles:{cache:new Collection(ids.map(k=>[k,roles.get(k)])),highest:roles.get(ids.at(-1)||'g')},permissions:new B(admin?[P.Administrator]:[P.ViewChannel,P.SendMessages])};members.set(id,m);return m;}
const opener=member('opener'),low=member('staff-low',['low']),high=member('staff-high',['high']),top=member('staff-top',['top']),outsider=member('outsider'),guest=member('guest-user',['guest']),below=member('below-user',['below-panel']),bot=member('bot',[],true);
let failSet=false;
const overwrites=new Collection();
function setRows(rows){overwrites.clear();for(const o of rows)overwrites.set(o.id,{...o,allow:new B(o.allow),deny:new B(o.deny)});}
const channel={id:'ticket',guild,name:'ticket',permissionOverwrites:{cache:overwrites,async set(rows){if(failSet)throw Error('Missing permissions');setRows(rows);}},
 permissionsFor(m){if(m.permissions.has(P.Administrator))return new B(B.All);let bits=m.permissions.bitfield;const everyone=overwrites.get('g');if(everyone)bits=(bits&~everyone.deny.bitfield)|everyone.allow.bitfield;let allow=0n,deny=0n;for(const id of m.roles.cache.keys()){const o=overwrites.get(id);if(o){allow|=o.allow.bitfield;deny|=o.deny.bitfield;}}bits=(bits&~deny)|allow;const own=overwrites.get(m.id);if(own)bits=(bits&~own.deny.bitfield)|own.allow.bitfield;return new B(bits);},async send(){}};
setRows([{id:'g',type:0,deny:[P.ViewChannel],allow:[]},...['low','high','top'].map(id=>({id,type:0,allow:[P.ViewChannel,P.SendMessages],deny:[]})),{id:'opener',type:1,allow:[P.ViewChannel,P.SendMessages],deny:[]},{id:'bot',type:1,allow:[P.ViewChannel,P.SendMessages],deny:[]}]);
tickets.createTicket({guildId:'g',userId:'opener',channelId:'ticket'});tickets.setStaffThread('ticket','thread',['low','high','top']);
function ui(actor,options={}){return {channel,guild,guildId:'g',user:{id:actor.id},options:{getUser:()=>options.user?{id:options.user}:null,getRole:()=>options.role?roles.get(options.role):null},async deferReply(){this.deferred=true;this.ephemeral=true;},async editReply(p){this.response=p;}};}
(async()=>{
 failSet=true;await access.claim(null,ui(low));assert.equal(tickets.getTicket('ticket').claimed_by,null);failSet=false;
 await access.claim(null,ui(low));assert.equal(tickets.getTicket('ticket').claimed_by,low.id);
 assert.ok(channel.permissionsFor(low).has(P.SendMessages));assert.ok(channel.permissionsFor(opener).has(P.SendMessages));
 assert.ok(channel.permissionsFor(high).has(P.ViewChannel));assert.ok(!channel.permissionsFor(high).has(P.SendMessages));assert.ok(channel.permissionsFor(high).has(P.SendMessagesInThreads));
 assert.ok(!channel.permissionsFor(below).has(P.ViewChannel),'Do not grant roles below the panel minimum');
 assert.ok(require('../services/ticketDiscussion').canDiscuss(tickets.getTicket('ticket'),high,channel));
 await access.change(ui(high,{user:'outsider'}),false);assert.ok(channel.permissionsFor(outsider).has(P.SendMessages));
 await access.change(ui(high,{role:'guest'}),false);assert.ok(channel.permissionsFor(guest).has(P.ViewChannel));assert.ok(channel.permissionsFor(guest).has(P.SendMessages));
 assert.ok(!channel.permissionsFor(top).has(P.SendMessages));
 await access.change(ui(low,{user:'staff-high'}),true);assert.ok(channel.permissionsFor(high).has(P.ViewChannel));
 await access.change(ui(low,{role:'high'}),true);assert.ok(channel.permissionsFor(high).has(P.ViewChannel));
 await access.change(ui(high,{user:'outsider'}),true);assert.ok(!channel.permissionsFor(outsider).has(P.ViewChannel));
 await access.claim(null,ui(high));assert.equal(tickets.getTicket('ticket').claimed_by,high.id);assert.ok(!channel.permissionsFor(low).has(P.ViewChannel));
 assert.ok(channel.permissionsFor(top).has(P.ViewChannel));assert.ok(!channel.permissionsFor(top).has(P.SendMessages));assert.ok(channel.permissionsFor(opener).has(P.SendMessages));assert.ok(channel.permissionsFor(guest).has(P.SendMessages));
 await access.claim(null,ui(high));assert.equal(tickets.getTicket('ticket').staff_min_rank,20);
 await access.claim(null,ui(low));assert.equal(tickets.getTicket('ticket').claimed_by,high.id);
 await access.change(ui(top,{user:'staff-low'}),false);assert.ok(!channel.permissionsFor(low).has(P.ViewChannel));
 await access.claim(null,ui(top));assert.equal(tickets.getTicket('ticket').claimed_by,top.id);assert.ok(!channel.permissionsFor(high).has(P.ViewChannel));
 const saved=tickets.getTicket('ticket');tickets.ensureTicketSchema();assert.equal(tickets.getTicket('ticket').staff_min_rank,30);
 assert.ok(!require('../services/ticketDiscussion').canDiscuss(saved,low,channel));
 // A staff-only export is never sent to the owner and failures abort the lifecycle.
 let exports=[],staffSent=0,ownerSent=0,failed=false;
 require('discord-html-transcripts').createTranscript=async c=>{exports.push(c.id);return Buffer.from(c.id==='thread'?'PRIVATE STAFF':'PUBLIC TICKET');};
 config.Tickets.ThreadLogChannel='staff-log';config.Tickets.LogChannel='';
 const thread={id:'thread',type:ChannelType.PrivateThread,parentId:channel.id};
 guild.channels.fetch=async id=>id==='thread'?thread:{guild,isTextBased:()=>true,async send(p){if(failed)throw Error('log unavailable');assert.equal(p.files[0].attachment.toString(),'PRIVATE STAFF');staffSent++;}};
 const {deliverTranscript}=require('../services/ticketTranscript');
 const client={users:{fetch:async()=>({async send(p){ownerSent++;assert.equal(p.files[0].attachment.toString(),'PUBLIC TICKET');}})}};
 await deliverTranscript(client,channel,saved);assert.deepEqual(exports,['thread','ticket']);assert.equal(staffSent,1);assert.equal(ownerSent,1);
 failed=true;await assert.rejects(deliverTranscript(client,channel,saved),/log unavailable/);assert.equal(ownerSent,1);
 config.Tickets.ThreadLogChannel='';await assert.rejects(deliverTranscript(client,channel,saved),/ThreadLogChannel/);
 const settings=require('../database/guildSettings');assert.ok(settings.getEditablePaths().includes('Tickets.ThreadLogChannel'));
 for(const cmd of ['ticket-add','ticket-remove']){const data=require('../commands/tickets/'+cmd).data.toJSON();assert.equal(data.options.length,2);}
 console.log('PASS: failed claim rollback, claim permissions, no panel-role leak, thread access, user/role add/remove, hierarchy, takeover, persistent minimum, separate private export and fail-closed logging.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{db.closeDatabase();fs.rmSync(tmp,{recursive:true,force:true});fs.rmSync(path.join(__dirname,'../transcripts/g'),{recursive:true,force:true});});
