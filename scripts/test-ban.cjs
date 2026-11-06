const assert = require('node:assert/strict');
const loc = require('../utils/localization');
loc.send = (target, method, data) => target[method](data);
const ban = require('../commands/moderation/ban');
const targetId = '123456789012345678', moderatorId = '223456789012345678';
function fixture({member = null, code = 10007, user = null, id = targetId, owner = false, banError = null} = {}) {
    const events = [];
    const client = {user:{id:'323456789012345678'}};
    const i = {
        options: {getUser:()=>user,getString:key=>key==='reden'?'Testreden':id,getInteger:()=>7},
        user: {id:moderatorId,tag:'Moderator'},
        guild: {name:'Test',ownerId:owner?moderatorId:'423456789012345678',
            members:{fetch:async ({user:id})=>{if(id===moderatorId)return {roles:{highest:{}}};if(member)return member;throw Object.assign(Error('fetch'),{code});}},
            bans:{create:async (id,options)=>{events.push({id,options});if(banError)throw Object.assign(Error('ban'),{code:banError});}}},
        deferReply:async()=>{},editReply:async data=>{i.output=data;}
    };
    return {client,i,events};
}
async function run(options) {const f=fixture(options);await ban.execute(f.client,f.i);return f;}
(async()=>{
    let f=await run();assert.equal(f.events.length,1);assert.equal(f.events[0].id,targetId);assert.equal(f.events[0].options.deleteMessageSeconds,604800);assert.ok(f.i.output.embeds);
    for(const id of ['abc','-123456789012345678','18446744073709551616',moderatorId,'323456789012345678','423456789012345678',null]) {
        f=await run({id});assert.equal(f.events.length,0);
    }
    f=await run({user:{id:targetId}});assert.equal(f.events.length,0);
    for(const code of [50013,50001,'ECONNRESET']) {
        f=fixture({code});await assert.rejects(ban.execute(f.client,f.i));assert.equal(f.events.length,0);
    }
    const member={bannable:true,roles:{highest:{comparePositionTo:()=>0}},user:{id:targetId,tag:'Target',send:async()=>{}}};
    f=await run({member});assert.equal(f.events.length,0);
    f=await run({member,owner:true});assert.equal(f.events.length,1);
    member.roles.highest.comparePositionTo=()=>-1;member.bannable=false;
    f=await run({member});assert.equal(f.events.length,0);
    member.bannable=true;
    let notified=0; member.user.send=async()=>{notified++;throw Error('DM closed');};
    f=await run({member,user:member.user,id:null});assert.equal(f.events.length,1);assert.equal(notified,1);assert.ok(f.i.output.embeds);
    notified=0;
    f=await run({member,banError:50013});assert.equal(notified,0);assert.ok(f.i.output.content);assert.equal(f.i.output.embeds,undefined);
    f=await run({banError:10013});assert.ok(f.i.output.content);
    const options=ban.data.toJSON().options;assert.equal(options[0].name,'reden');assert.equal(options[0].required,true);assert.ok(options.slice(1).every(o=>!o.required));
    assert.deepEqual(ban.permissions,['BanMembers']);
    console.log('PASS: external ID bans, existing member hierarchy, invalid input, protected targets, fail-closed fetch, API errors and DM failure.');
})().catch(e=>{console.error(e);process.exitCode=1;});
