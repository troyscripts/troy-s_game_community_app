const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'government-'));
const config=require('../config/defaults');config.Database.File=path.join(tmp,'test.sqlite');config.Logging.Enabled=false;
const {db}=require('../database/database');
const store=require('../database/governmentTickets');
const {canHandle}=require('../services/governmentAccess');
const {Collection,PermissionsBitField,PermissionFlagsBits:P,ChannelType}=require('discord.js');
const svc=require('../services/governmentTickets');
const access={roles:['department'],users:['responsible']};
const member=(id,roles=[])=>({id,user:{bot:false},guild:{id:'guild'},roles:{cache:new Collection(roles.map(r=>[r,{}]))}});
assert.equal(canHandle(member('worker',['department']),access),true);
assert.equal(canHandle(member('responsible'),access),true);
assert.equal(canHandle(member('staff',['staff','HeadAdmin']),access),false);
assert.equal(canHandle(member('lost-role'),access),false);
assert.equal(canHandle(member('outsider',['guild']),{roles:['guild'],users:[]}),false);
store.save('guild','politie','0',{...access,category:'category',enabled:true});
assert.equal(store.get('other','politie','0').enabled,false);
assert.equal(store.get('guild','ambulance','0').enabled,false);
for(const name of ['politie','ambulance','pechhulp','brandweer','overheidscoordinator']) {
 const command=require('../commands/government/'+name);const data=command.data.toJSON();
 assert.equal(data.name,name);assert.ok(data.options[0].choices.length);assert.equal(command.notifyOnly,true);
}
// Coordinator configuration is isolated from the four operational services.
const coordinatorAccess={roles:['coordinator-role'],users:['coordinator']};
store.save('guild','overheidscoordinator','0',{...coordinatorAccess,category:'coordinator-category',enabled:true});
assert.equal(store.get('guild','politie','0').category,'category');
assert.equal(store.get('other','overheidscoordinator','0').enabled,false);
assert.equal(canHandle(member('worker',['department']),coordinatorAccess),false);
assert.equal(canHandle(member('coordinator'),coordinatorAccess),true);
assert.equal(canHandle(member('delegate',['coordinator-role']),coordinatorAccess),true);
assert.equal(canHandle(member('coordinator'),access),false);
let created=0,posted=0,permissions;
const me={id:'bot'};
const channel={id:'ticket',send:async()=>{posted++;},permissionOverwrites:{edit:async()=>{}},permissionsFor:()=>new PermissionsBitField(P.ViewChannel)};
const guild={id:'guild',roles:{fetch:async()=>new Collection([['department',{managed:false}]])},members:{fetchMe:async()=>me,fetch:async({user})=>member(user,user==='worker'?['department']:[])},channels:{fetch:async id=>id==='category'?{id,type:ChannelType.GuildCategory,permissionsFor:()=>new PermissionsBitField(PermissionsBitField.All)}:channel,create:async args=>{created++;permissions=args.permissionOverwrites;return channel;}}};
function interaction(id,user='opener',values=['0']) {
 return {customId:id,user:{id:user},values,guild,guildId:'guild',channelId:'ticket',channel,
  reply:async function(x){this.result=x;},deferReply:async()=>{},editReply:async function(x){this.result=x;}};
}
(async()=>{
 const first=interaction('gov:open:politie'); await svc.interact(null,first);assert.equal(created,1);assert.equal(posted,1);
 assert.equal(permissions.find(x=>x.id==='guild').deny[0],P.ViewChannel);
 assert.equal(permissions.some(x=>x.id==='staff'),false);
 assert.ok(permissions.some(x=>x.id==='responsible'));
 const again=interaction('gov:open:politie');await svc.interact(null,again);assert.equal(created,1);assert.match(again.result,/al een ticket/);
 const denied=interaction('gov:claim','staff');await svc.interact(null,denied);assert.match(denied.result.content,/Alleen de ingestelde/);
 const claim=interaction('gov:claim','worker');await svc.interact(null,claim);assert.equal(store.ticket('guild','ticket').claimed,'worker');
 const competing=interaction('gov:claim','responsible');await svc.interact(null,competing);assert.match(competing.result,/al geclaimd/);
 const transcriptModule=require('../services/boundedTranscript');
 const originalTranscript=transcriptModule.createTranscript;
 transcriptModule.createTranscript=async()=>({attachment:Buffer.from('transcript'),name:'test.html'});
 const originalLog=config.Tickets.LogChannel;config.Tickets.LogChannel='log';
 let removed=false,logged=false;
 const oldFetch=guild.channels.fetch;
 guild.channels.fetch=async id=>id==='log'?{guildId:'guild',isTextBased:()=>true,permissionsFor:()=>new PermissionsBitField(PermissionsBitField.All),send:async()=>{logged=true;}}:oldFetch(id);
 const oldPermissions=channel.permissionsFor;channel.permissionsFor=()=>new PermissionsBitField(PermissionsBitField.All);
 channel.delete=async()=>{assert.equal(logged,true);removed=true;};
 const close=interaction('gov:confirmclose','worker');await svc.interact(null,close);assert.equal(removed,true);assert.equal(store.ticket('guild','ticket').status,'deleted');
 transcriptModule.createTranscript=originalTranscript;config.Tickets.LogChannel=originalLog;guild.channels.fetch=oldFetch;channel.permissionsFor=oldPermissions;assert.equal(store.existing('guild','politie','0','opener'),undefined);
 assert.equal(store.ticket('other','ticket'),undefined);
 // Configuration changes never mutate the ACL snapshot of an existing ticket.
 store.save('guild','politie','0',{roles:['new'],users:[],category:'category',enabled:true});
 assert.deepEqual(JSON.parse(store.ticket('guild','ticket').access),access);
 // No staff gate in ticket handling; both router adapters point to this service.
 for(const folder of ['buttons','selectmenus']) assert.equal(require('../'+folder+'/government').execute,svc.interact);
 // Render stored role mentions as names, add useful descriptions, refresh an existing panel.
 const {display}=require('../services/governmentLabels');
 const roleId='1514613029256564786';
 const namedRoles=new Collection([[roleId,{name:'Korpsleiding'}]]);
 assert.deepEqual(display('politie','0',{label:`<@&${roleId}>`},namedRoles),{label:'Korpsleiding',description:'Neem contact op met de korpsleiding.'});
 assert.equal(display('politie','0',{label:'<@&999999999999999999>'},namedRoles).label,'Korpsleiding');
 assert.equal(display('politie','0',{label:'<@123456789012345678>'},namedRoles).label,'Korpsleiding');
 assert.equal(display('politie','0',{label:'Eigen afdeling',description:'Voor jouw vraag over beleid.'},namedRoles).description,'Voor jouw vraag over beleid.');
 const previousOwners=config.Owners;config.Owners=['setup-owner'];
 store.save('guild','politie','0',{roles:[roleId],users:[],category:'category',enabled:true,label:`<@&${roleId}>`});
 let edited,newPanels=0;
 const panel={author:{id:'bot'},components:[{components:[{customId:'gov:open:politie'}]}],edit:async p=>{edited=p;}};
 const publish=interaction('', 'setup-owner');
 publish.options={getString:()=>null};
 publish.guild={...guild,members:{...guild.members,fetch:async()=>member('setup-owner')},roles:{fetch:async()=>namedRoles}};
 publish.channel={type:ChannelType.GuildText,messages:{fetch:async()=>new Collection([['panel',panel]])},send:async()=>{newPanels++;}};
 await svc.command({user:{id:'bot'}},publish,'politie');
 assert.equal(newPanels,0);assert.ok(edited);
 const option=edited.components[0].toJSON().components[0].options[0];
 assert.equal(option.label,'Korpsleiding');assert.ok(option.description);assert.equal(option.value,'0');
 publish.channel.messages.fetch=async()=>new Collection();
 await svc.command({user:{id:'bot'}},publish,'politie');assert.equal(newPanels,1);
 config.Owners=previousOwners;
 console.log('PASS: government command payloads, server/department isolation, explicit ACLs, role-based nonstaff access, duplicate prevention, claim contention, closing and ACL snapshots.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{db.close();fs.rmSync(tmp,{recursive:true,force:true});});
