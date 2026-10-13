'use strict';
// Local integration test: real Discord builders and a temporary SQLite database.
// No Discord connection and no external AI requests.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'troy-language-'));
const defaults=require('../config/defaults');defaults.Database.File=path.join(tmp,'test.sqlite');defaults.Logging.Enabled=false;
const database=require('../database/database');database.initializeDatabase();
const settings=require('../database/guildSettings');settings.initialize();
const l=require('../utils/localization'),d=require('../utils/discord');
const guildId='111111111111111111',userId='709486570293559356';
const guild={id:guildId,name:'Test Community',memberCount:42,ownerId:userId};
settings.ensureGuild(guild);
assert.ok(!/[\uE000-\uE002]/.test(settings.getGuildConfig(guildId).Welcome.Message));
const defaultWelcome=require('../utils/welcomeMessage').renderWelcome(defaults.Welcome.Message,{id:userId,user:{username:'Tester'},guild});
assert.match(l.render(defaultWelcome,'en'),/Welcome/);
let languages=require('../database/languages');languages.set(guildId,userId,'en');
delete require.cache[require.resolve('../database/languages')];languages=require('../database/languages');
assert.equal(languages.get(guildId,userId),'en');assert.equal(languages.get('other',userId),'nl');
const marked=l.tr('✅ Jouw keuze(s): {0}',l.pair('Rood','Red'));
assert.equal(l.render(marked,'en'),'✅ Your selection(s): Red');
assert.equal(l.render(marked,'nl'),'✅ Jouw keuze(s): Rood');
const userText='Eigen tekst **niet vertalen** <@123>';assert.equal(l.visible(userText,'both'),userText);
const row=new d.ActionRowBuilder().addComponents(new d.ButtonBuilder().setCustomId('original:id').setStyle(1).setLabel(l.tr('Annuleren')));
const embed=new d.EmbedBuilder().setTitle(l.tr('🎂 Verjaardag')).setDescription(marked).addFields({name:l.tr('Gebruiker'),value:userText});
function noMarkers(data){assert.ok(!/[\uE000-\uE002]/.test(JSON.stringify(data)));}
function interaction(action,args={}){return {guildId,guild,channelId:'c',user:{id:userId,username:'Tester'},member:{guild,roles:{cache:{has:()=>false}},permissions:{has:()=>true}},isRepliable:()=>true,
 options:{getSubcommand:()=>action,getString:k=>args[k]??null,getInteger:k=>args[k]??null,getBoolean:k=>args[k]??null},
 async deferReply(p){this.deferred=true;this.ephemeral=Boolean(p?.flags&64);},async reply(p){this.response=p;this.ephemeral=Boolean(p?.flags&64);noMarkers(p);},async editReply(p){this.response=p;noMarkers(p);},async showModal(p){this.response=p;noMarkers(p);},async update(p){this.response=p;noMarkers(p);},async followUp(p){this.response=p;noMarkers(p);}};}
(async()=>{
 try{
 const i=interaction();await l.send(i,'reply',{embeds:[embed],components:[row],flags:64});assert.equal(i.response.embeds[0].title,'🎂 Birthday');
 const dm={id:userId,username:'Tester',async send(p){this.response=p;noMarkers(p);}};await require('../config/config').__context.run(guildId,()=>l.send(dm,'send',{embeds:[embed]}));assert.equal(dm.response.embeds[0].title,'🎂 Birthday');
assert.equal(i.response.components[0].components[0].label,'Cancel');assert.equal(i.response.components[0].components[0].custom_id,'original:id');assert.equal(i.response.embeds[0].fields[0].value,userText);
 await l.send(i,'followUp',{embeds:[embed]});assert.match(i.response.embeds[0].description,/keuze.*\n\n.*selection/s);
 const modal=new d.ModalBuilder().setCustomId('test').setTitle(l.tr('Selfrolpaneel maken')).addComponents(new d.ActionRowBuilder().addComponents(new d.TextInputBuilder().setCustomId('text').setStyle(2).setLabel(l.tr('Titel'))));await l.send(i,'showModal',modal);assert.equal(i.response.title,'Create self-role panel');assert.equal(i.response.components[0].components[0].label,'Title');
 const long=l.pair('n'.repeat(4000),'e'.repeat(4000));const limit=l.payload({embeds:Array.from({length:10},()=>({title:long,description:long,fields:[{name:long,value:long}]}))},'both');
 let total=0;for(const e of limit.embeds){assert.ok(e.title.length<=256&&e.description.length<=4096);total+=e.title.length+e.description.length;for(const f of e.fields){assert.ok(f.name.length<=256&&f.value.length<=1024);total+=f.name.length+f.value.length;}}assert.ok(total<=6000);noMarkers(limit);
 // Every command, option and choice is valid after registration localization.
 let count=0;function commands(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const filename=path.join(dir,entry.name);if(entry.isDirectory()){commands(filename);continue;}const data=l.commandData(require(filename).data.toJSON());function check(c){assert.ok(!c.description||c.description.length<=100);for(const locale of ['en-US','en-GB'])if(c.description)assert.ok(c.description_localizations[locale].length<=100);if(c.options){const names=c.options.map(v=>v.name_localizations?.['en-US']||v.name);assert.equal(new Set(names).size,names.length);c.options.forEach(check);}c.choices?.forEach(v=>assert.ok(v.name_localizations['en-US'].length<=100));}check(data);noMarkers(data);count++;}}commands(path.resolve(__dirname,'../commands'));assert.equal(count,56);
 assert.equal(l.commandData({name:'categorie1',description:'Naam van categorie 1, bijvoorbeeld Support of Bug melden'}).description_localizations['en-US'],'Name of category 1, for example Support or Bug report');
 // Poll translations are persisted, preserve answer indices and are not requested on votes/timer edits.
 let requests=0,failProvider=false,invalid=false,onRequest=null;
 require('../services/groqConnection').requestChat=async ({messages})=>{requests++;if(onRequest)onRequest();if(failProvider)throw Error('offline');const input=JSON.parse(messages.at(-1).content);if(input.question)return {message:{content:JSON.stringify({question:'EN '+input.question,options:invalid?[]:input.options.map(s=>'EN '+s)})}};return {message:{content:JSON.stringify({english:input.text.replace('Welkom','Welcome').replace(' leden!',' members!')})}};};
 delete require.cache[require.resolve('../services/pollTranslation')];delete require.cache[require.resolve('../services/polls')];
 const translation=require('../services/pollTranslation');await assert.rejects(()=>translation.translate('Q',['A','B'],{questionEn:'Q',answersEn:'A'}));invalid=true;await assert.rejects(()=>translation.translate('Q',['A','B']));invalid=false;
 const polls=require('../services/polls'),pollStore=require('../database/polls');let nextId=1;const messages=new Map();
 const channel={id:'c',guildId,guild,async send(p){noMarkers(p);const message={id:String(nextId++),url:'https://discord.com/test',payload:p,async edit(data){noMarkers(data);this.payload=data;}};messages.set(message.id,message);return message;},messages:{async fetch(id){return messages.get(id);}}};
 const client={channels:{async fetch(){return channel;}}};
 async function command(action,args){const i=interaction(action,args);i.channel=channel;await polls.command(client,i);return i;}
 await command('maken',{vraag:'Wat spelen we?',antwoorden:'Voetbal|Schaken',minuten:60});let poll=pollStore.get(1);assert.equal(poll.questionEn,'EN Wat spelen we?');assert.deepEqual(poll.optionsEn,['EN Voetbal','EN Schaken']);assert.match(messages.get(poll.messageId).payload.embeds[0].fields[0].value,/Voetbal.*\n\n.*EN Voetbal/s);
 let vote=interaction();vote.channel=channel;vote.customId=`poll:1:${poll.revision}:1`;vote.message=messages.get(poll.messageId);await polls.vote(client,vote);assert.deepEqual(pollStore.get(1).votes[userId],[1]);assert.match(vote.response.content,/Your selection\(s\): EN Schaken/);
 const before=requests;await command('wijzigen',{id:1,minuten:30});assert.equal(requests,before);assert.deepEqual(pollStore.get(1).votes[userId],[1]);
 await command('wijzigen',{id:1,vraag:'Nieuw?',antwoorden:'Een|Twee'});assert.equal(pollStore.get(1).questionEn,'EN Nieuw?');assert.equal(Object.keys(pollStore.get(1).votes).length,0);
 failProvider=true;await command('wijzigen',{id:1,vraag:'Niet opslaan'});assert.equal(pollStore.get(1).question,'Nieuw?');await command('maken',{vraag:'Fail',antwoorden:'A|B',minuten:10});assert.equal(pollStore.get(2),null);failProvider=false;
 await command('wijzigen',{id:1,'vraag-en':'Manual question','antwoorden-en':'One|Two'});assert.equal(pollStore.get(1).questionEn,'Manual question');
 const maxPoll={...pollStore.get(1),question:'N'.repeat(500),questionEn:'E'.repeat(700),options:Array(10).fill('N'.repeat(80)),optionsEn:Array(10).fill('E'.repeat(120))};const maxPayload=l.payload(polls.payload(maxPoll),'both');for(const field of maxPayload.embeds[0].fields)assert.ok(!field.value.includes('…'));noMarkers(maxPayload);
 // Welcome translations retain placeholders, persist, and never apply to an edited source.
 const welcome=require('../services/welcomeTranslation'),welcomeStore=require('../database/welcomeTranslations'),{renderWelcome}=require('../utils/welcomeMessage');
 const source='Welkom {gebruiker} in {server}, {ledenaantal} leden!';settings.setWelcomeMessage(guildId,source);await welcome.translate(guildId);assert.equal(welcomeStore.get(guildId,source),'Welcome {gebruiker} in {server}, {ledenaantal} members!');const member={id:userId,user:{username:'Tester'},guild};const rendered=l.visible(renderWelcome(source,member),'both');assert.match(rendered,/Welkom.*\n\nWelcome/s);assert.equal((rendered.match(/<@709486570293559356>/g)||[]).length,2);
 assert.throws(()=>welcome.validate(source,'Missing placeholders'));settings.setWelcomeMessage(guildId,'Andere tekst');assert.equal(welcomeStore.get(guildId,'Andere tekst'),null);assert.equal(l.render(renderWelcome('Andere tekst',member),'en'),'Andere tekst');
 onRequest=()=>settings.setWelcomeMessage(guildId,'Changed during request');await assert.rejects(()=>welcome.translate(guildId));assert.equal(welcomeStore.get(guildId,'Andere tekst'),null);onRequest=null;
 failProvider=true;await assert.rejects(()=>welcome.translate(guildId));assert.equal(settings.getGuildConfig(guildId).Welcome.Message,'Changed during request');failProvider=false;
 // /say translation is opt-in, permissions are checked first, failures do not publish.
 const say=require('../commands/fun/say');const sent=[];const target={guildId,guild,permissionsFor:()=>({has:()=>true}),async send(p){sent.push(p);noMarkers(p);},toString:()=>'<#c>'};guild.members={me:{}};
 function sayInteraction(args){const i=interaction('say',args);i.channel=target;i.options.getChannel=()=>null;return i;}
 const si=sayInteraction({bericht:'Welkom',embed:false,vertalen:true});await say.execute(client,si);assert.equal(sent.at(-1).content,'Welkom\n\nWelcome');
 const rawSay=sayInteraction({bericht:'Welkom',embed:false});const calls=requests;await say.execute(client,rawSay);assert.equal(requests,calls);assert.equal(sent.at(-1).content,'Welkom');
 const embedSay=sayInteraction({bericht:'Welkom',embed:true,engels:'Welcome'});await say.execute(client,embedSay);assert.equal(sent.at(-1).embeds[0].description,'Welkom\n\nWelcome');
 failProvider=true;const sentBefore=sent.length;await say.execute(client,sayInteraction({bericht:'Fail',embed:false,vertalen:true}));assert.equal(sent.length,sentBefore);failProvider=false;
 // Regression: execute actual /work and /daily, including the VIP/birthday bonus.
 // Rendering synthetic embeds alone does not detect an unmarked command string.
 settings.updateValue(guildId,'Birthday.Role','222222222222222222');
 require('../config/rewardBonuses').Enabled=true;
 for(const name of ['work','daily']) {
     const rewardInteraction=interaction(name);
     rewardInteraction.member.roles.cache.has=id=>id==='222222222222222222';
     await require('../config/config').__context.run(guildId,()=>require('../commands/economy/'+name).execute(client,rewardInteraction));
     const output=rewardInteraction.response.embeds[0];
     noMarkers(output);
     assert.equal((output.description.match(/2× beloning/g)||[]).length,1);
     assert.equal((output.description.match(/2× reward/g)||[]).length,1);
     if(name==='work') {
         assert.equal(output.title,'💼 Werk voltooid\n\n💼 Work completed');
         assert.equal((output.description.match(/Je verdiende/g)||[]).length,1);
         const dutch=/Je verdiende \*\*€(\d+)\*\*/.exec(output.description);
         const english=/You earned \*\*€(\d+)\*\*/.exec(output.description);
         assert.ok(dutch&&english);assert.equal(dutch[1],english[1]);
     } else {
         assert.equal((output.description.match(/Je kreeg/g)||[]).length,1);
         assert.match(output.description,/You received/);
     }
 }
 // /help follows stored preference; public response is always bilingual.
 const help=require('../commands/general/help');const hi=interaction('help');await help.execute(client,hi);assert.equal(hi.response.files[0].name,'MANUAL-EN.md');assert.match(hi.response.content,/Voor support/);assert.match(hi.response.content,/For support/);noMarkers(hi.response);
 console.log('PASS: 56 commands, native Discord builders, persistent server-scoped languages, public/private/DM rendering, limits, unchanged user text, translated polls and votes, safe failures, welcome placeholders/races, optional /say translation and bilingual help.');
 }finally{database.closeDatabase();fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
