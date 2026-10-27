const assert = require('node:assert/strict');
const Module = require('node:module');
const config = require('../config/config');
const permissions = require('../utils/permissions');
const realLoad = Module._load;
// No network or Discord messages: replace only the logger and command builders.
const builder = new Proxy({}, {get: (_t, key) => key === 'then' ? undefined : () => builder});
Module._load = function(name, ...args) {
    if (name === '../utils/logger') return {info() {}, warn() {}};
    if (name === 'discord.js') return {SlashCommandBuilder: function() {return builder;}, MessageFlags: {Ephemeral: 64}};
    return realLoad.call(this, name, ...args);
};
const {broadcast} = require('../services/botBroadcast');
const command = require('../commands/owner/botbericht');
Module._load = realLoad;
const owner = '709486570293559356';
const settings = {Roles:{Admin:'admin',HeadAdmin:'head',Developer:'dev',Owner:'owner',Moderator:'mod',HeadModerator:'headmod'},Owners:['global-owner'],Developers:['global-dev']};
config.__context.setProvider(id => ({...config.__context.defaults,...settings,Logging:{Enabled:false,Channel: id === 'missing' ? '' : `${id}-log`}}));
function interaction(id, role, administrator=false) {
    const guild = {id:'source', ownerId:'server-owner'};
    return {user:{id},guild,member:{id,user:{id},guild,roles:{cache:new Set(role?[role]:[])},permissions:{has:p=>p==='ManageMessages'||(administrator&&p==='Administrator')}}};
}
(async()=>{
    await config.__context.run('source', async()=>{
        for(const role of ['admin','head','dev','owner']) assert.equal(permissions.canUseCommand(interaction('user',role),{adminOnly:true}),true);
        for(const role of ['mod','headmod',null]) assert.equal(permissions.canUseCommand(interaction('user',role),{adminOnly:true}),false);
        for(const id of [owner,'server-owner','global-owner','global-dev']) assert.equal(permissions.canUseCommand(interaction(id),{adminOnly:true}),true);
        assert.equal(permissions.canUseCommand(interaction('administrator',null,true),{adminOnly:true}),true);
        for(const id of ['server-owner','global-owner','global-dev','administrator']) assert.equal(permissions.canUseCommand(interaction(id,'owner',true),command),false);
        assert.equal(permissions.canUseCommand(interaction(owner),command),true);
    });
    let replies=0;
    await command.execute({}, {user:{id:'attacker'},reply:async()=>{replies++;}});
    assert.equal(replies,1);
    const sent=[];
    const guilds=['first','missing','broken','foreign','last'].map(id=>({id,name:id,channels:{fetch:async channelId=>{
        assert.equal(channelId,`${id}-log`);
        if(id==='broken') throw new Error('Missing permissions');
        return {id:channelId,name:'logs',guild:{id:id==='foreign'?'other':id},isTextBased:()=>true,send:async payload=>sent.push({id,payload})};
    }}}));
    const client={guilds:{cache:new Map(guilds.map(g=>[g.id,g]))}};
    await assert.rejects(broadcast(client,'attacker','test'),/boteigenaar/);
    for(const message of ['', '  ', 'x'.repeat(2001)]) await assert.rejects(broadcast(client,owner,message),/2000/);
    const result=await config.__context.run('source',()=>broadcast(client,owner,'Hello @everyone'));
    assert.deepEqual(result,{sent:2,skipped:1,failed:2});
    assert.deepEqual(sent.map(x=>x.id),['first','last']);
    for(const {payload} of sent) assert.deepEqual(payload,{content:'Hello @everyone',allowedMentions:{parse:[]}});
    let release;
    const pending=broadcast({guilds:{cache:new Map([['wait',{id:'wait',channels:{fetch:()=>new Promise(resolve=>{release=resolve;})}}]])}},owner,'test');
    await assert.rejects(broadcast(client,owner,'test'),/al een botbericht/);
    release(null); await pending;
    assert.deepEqual(await broadcast({guilds:{cache:new Map()}},owner,'test'),{sent:0,skipped:0,failed:0});
    console.log('PASS: admin access, owner-only command/service, per-guild destinations, skipped/failed channels, no pings, concurrency and recovery.');
})().catch(e=>{console.error(e);process.exitCode=1;});
