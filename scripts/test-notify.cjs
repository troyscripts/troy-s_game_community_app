'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
let db;
try { db = new (require('better-sqlite3'))(':memory:'); db.pragma('foreign_keys = ON'); }
catch {
    // Sandbox fallback only; production uses the existing better-sqlite3 dependency.
    const { DatabaseSync } = require('node:sqlite');
    db = new DatabaseSync(':memory:'); db.exec('PRAGMA foreign_keys = ON');
    db.transaction = fn => (...args) => { db.exec('BEGIN'); try {const result=fn(...args);db.exec('COMMIT');return result;} catch(e){db.exec('ROLLBACK');throw e;} };
}
require.cache[require.resolve('../database/database')] = {exports:{db}};
require.cache[require.resolve('../utils/logger')] = {exports:{warn(){},info(){}}};
const store = require('../database/notify');
const providers = require('../services/notify/providers');
const service = require('../services/notifyService');
const config = require('../config/config');
const permissions = require('../utils/permissions');
const { ChannelType } = require('discord.js');
const command = require('../commands/administration/notify');
const reset = () => { store.init(); db.exec('DELETE FROM notify_items; DELETE FROM notify_creators; DELETE FROM notify_migrations;'); };
const channelId = 'UC'+'a'.repeat(22);
const entry = (id,date) => `<entry><yt:videoId>${id}</yt:videoId><title>Test &amp; video</title><published>${date}</published></entry>`;
const feed = entries => `<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015"><yt:channelId>${channelId}</yt:channelId>${entries}</feed>`;
const item = (id,published) => ({id,published,title:id,url:`https://www.youtube.com/watch?v=${id}`});

test('permissions: only configured roles/owners/developers; no generic Administrator',() => {
    const previous = config.__context.defaults;
    const roles = {HeadAdmin:'head-role',Owner:'owner-role',Developer:'dev-role'};
    config.__context.setProvider(guildId => ({...previous,Owners:['global-owner'],Developers:['global-dev'],Roles:guildId === 'guild-a' ? roles : {},Notify:{PingRole1:guildId === 'guild-a' ? 'ping-a' : 'ping-b'}}));
    const member = (role,guildId='guild-a') => ({guild:{id:guildId,ownerId:'server-owner'},user:{bot:false},roles:{cache:new Set([role])},permissions:{has:()=>true}});
    config.__context.run('guild-a',() => {
        for (const role of Object.values(roles)) assert.equal(permissions.hasNotifyAccess(member(role),'ordinary'),true);
        for (const id of ['global-owner','global-dev','server-owner']) assert.equal(permissions.hasNotifyAccess(member('none'),id),true);
        assert.equal(permissions.hasNotifyAccess(member('admin-role'),'ordinary'),false);
        assert.equal(permissions.canUseCommand({user:{id:'ordinary'},member:member('admin-role')},command),false);
        assert.equal(permissions.hasNotifyAccess({...member('head-role'),user:{bot:true}},'ordinary'),false);
    });
    config.__context.run('guild-b',() => assert.equal(permissions.hasNotifyAccess(member('head-role','guild-b'),'ordinary'),false));
});
test('commands serialize with valid Discord builders',() => {
    const json = command.data.toJSON(); assert.equal(json.name,'notify'); assert.equal(json.options.length,6);
});
test('profile parsing rejects arbitrary hosts and video links',() => {
    assert.equal(providers.account('youtube','https://www.youtube.com/@Troys-Game-Community'),'@troys-game-community');
    assert.equal(providers.account('youtube',`https://youtube.com/channel/${channelId}`),channelId);
    assert.equal(providers.account('tiktok','https://www.tiktok.com/@TroysGameCommunity'),'troysgamecommunity');
    for (const value of ['http://127.0.0.1/','https://youtube.com.evil.example/@x','https://youtube.com/watch?v=abc','https://youtube.com:4431/@handle']) assert.throws(() => providers.account('youtube',value));
});
test('feed validates channel identity, content and XML entities',() => {
    const result = providers.parseFeed(feed(entry('video000001','2026-09-30T12:00:00Z')),channelId);
    assert.equal(result[0].title,'Test & video'); assert.equal(result[0].url,'https://www.youtube.com/watch?v=video000001');
    assert.throws(() => providers.parseFeed('<html>consent</html>',channelId));
    assert.throws(() => providers.parseFeed(feed(''),'UC'+'b'.repeat(22)));
    assert.throws(() => providers.parseFeed(feed(entry('bad','not a date')),channelId));
    assert.deepEqual(providers.parseFeed(feed(''),channelId),[]);
});
test('first baseline skips history; queues all new items once and preserves them after restart/change',() => {
    reset(); const row = store.save('guild-a','youtube','@creator','channel-a');
    store.ingest(row,[item('old',10)],100);
    assert.equal(store.pending(row.id).length,0);
    store.ingest(row,[item('new-one',101),item('new-two',102),item('old',10)],200);
    assert.equal(store.pending(row.id).length,2);
    store.sent(row.id,'new-one');
    store.init(); store.save('guild-a','youtube','@creator','channel-b');
    store.ingest(row,[item('new-one',101),item('new-two',102)],300);
    assert.deepEqual(store.pending(row.id).map(x=>x.item_id),['new-two']);
    assert.equal(store.get(row.id,'guild-b'),undefined);
    assert.equal(store.remove(row.id,'guild-b'),0);
    assert.equal(store.get(row.id,'guild-a').channel_id,'channel-b');
    store.remove(row.id,'guild-a'); assert.equal(store.pending(row.id).length,0);
});
test('preset is once-only and never re-adds deleted accounts or overwrites changes',() => {
    reset(); const preset={channelId:'channel-a',creators:[{platform:'youtube',account:'@creator'},{platform:'tiktok',account:'creator'}]};
    store.save('guild-a','youtube','@creator','custom-channel');store.seed('guild-a',preset);
    assert.equal(store.list('guild-a').find(x=>x.platform==='youtube').channel_id,'custom-channel');
    const row=store.list('guild-a').find(x=>x.platform==='tiktok');store.remove(row.id,'guild-a');
    store.seed('guild-a',preset); assert.equal(store.list('guild-a').length,1); assert.equal(store.list('guild-b').length,0);
});
test('test messages cannot ping; production only pings explicitly selected role; stable retry nonce',() => {
    const row={id:1,guild_id:'guild-a',platform:'youtube',account:'@creator',role_id:'allowed',message:'@everyone {titel} {url}'};
    const normal=service.payload(row,item('new',100));
    assert.deepEqual(normal.allowedMentions,{parse:[],roles:['allowed'],users:[]});
    assert.equal(normal.nonce,service.payload(row,item('new',100)).nonce);assert.equal(normal.enforceNonce,true);
    const sample=service.payload(row,item('new',100),true);assert.deepEqual(sample.allowedMentions.roles,[]);assert.equal(sample.nonce,undefined);
});
test('scheduler retains failed deliveries and handles restart without reposting; no cross-guild send',async () => {
    reset(); const sent=[]; const row=store.save('guild-a','youtube','@creator','channel-a');
    store.ingest(row,[],100);store.ingest(row,[item('queued',101)],200);
    const unknown=store.save('absent-guild','youtube','@elsewhere','other-channel');store.ingest(unknown,[],100);store.ingest(unknown,[item('other',101)],200);
    let fail=true;const guild={id:'guild-a',members:{me:{}},channels:{fetch:async id => {assert.equal(id,'channel-a');return channel;}}};
    const channel={type:ChannelType.GuildText,guild,permissionsFor:()=>({has:()=>true}),send:async payload=>{if(fail)throw new Error('Temporary Discord failure');sent.push(payload);}};
    const client={isReady:()=>true,channels:{fetch:async()=>null},guilds:{cache:new Map([['guild-a',guild]])}};
    const original=providers.youtube;providers.youtube=async()=>({items:[item('queued',101)]});
    try {
        service.startNotify(client);for(let i=0;i<20;i++)await new Promise(resolve=>setImmediate(resolve));await service.stopNotify();
        assert.equal(store.pending(row.id).length,1);assert.equal(sent.length,0);
        fail=false;service.retry(row.id);service.startNotify(client);for(let i=0;i<20;i++)await new Promise(resolve=>setImmediate(resolve));await service.stopNotify();
        assert.equal(store.pending(row.id).length,0);assert.equal(sent.length,1);assert.equal(store.pending(unknown.id).length,1);
        service.startNotify(client);for(let i=0;i<20;i++)await new Promise(resolve=>setImmediate(resolve));await service.stopNotify();assert.equal(sent.length,1);
    } finally {providers.youtube=original;await service.stopNotify();}
});
test('TikTok is explicitly pending without authorization, and rotates expiring tokens',async () => {
    const tokenFile=path.resolve(__dirname,'../data/notify-tokens.json');
    assert.equal(fs.existsSync(tokenFile),false,'Run this test in a clean checkout, not on the live bot host');
    await assert.rejects(()=>providers.tiktok({account:'example',baseline_at:null}),/Wacht op TikTok/);
    const oldFetch=global.fetch;const oldKey=process.env.TIKTOK_CLIENT_KEY;const oldSecret=process.env.TIKTOK_CLIENT_SECRET;
    process.env.TIKTOK_CLIENT_KEY='fixture-key';process.env.TIKTOK_CLIENT_SECRET='fixture-secret';
    const scopes='user.info.basic,user.info.profile,video.list';
    providers.saveToken('example',{access_token:'old',refresh_token:'old-refresh',expires_at:0,scope:scopes,open_id:'open-example'});
    const urls=[];
    global.fetch=async(url,opts)=>{
        urls.push(String(url));
        let body;
        if(String(url).includes('/oauth/token/'))body={access_token:'new',refresh_token:'rotated',expires_in:86400,scope:scopes,open_id:'open-example'};
        else if(String(url).includes('/user/info/')){assert.equal(opts.headers.Authorization,'Bearer new');body={data:{user:{username:'example',open_id:'open-example'}},error:{code:'ok'}};}
        else body={data:{videos:[{id:'123',title:'Example',create_time:123}],has_more:false},error:{code:'ok'}};
        return {ok:true,json:async()=>body};
    };
    try {
        const result=await providers.tiktok({account:'example',baseline_at:null});assert.equal(result.items.length,1);assert.equal(urls.length,3);
        assert.equal(providers.readTokens().example.refresh_token,'rotated');
    }finally{global.fetch=oldFetch;fs.unlinkSync(tokenFile);if(oldKey===undefined)delete process.env.TIKTOK_CLIENT_KEY;else process.env.TIKTOK_CLIENT_KEY=oldKey;if(oldSecret===undefined)delete process.env.TIKTOK_CLIENT_SECRET;else process.env.TIKTOK_CLIENT_SECRET=oldSecret;}
});

test('four configurable ping slots resolve per guild and follow configuration changes',() => {
    assert.equal(service.withPingRole({guild_id:'guild-a',role_slot:1}).role_id,'ping-a');
    assert.equal(service.withPingRole({guild_id:'guild-b',role_slot:1}).role_id,'ping-b');
    assert.equal(service.withPingRole({guild_id:'guild-a',role_slot:4}).role_id,null);
    assert.equal(service.withPingRole({guild_id:'guild-a',role_slot:null,role_id:'direct'}).role_id,'direct');
    reset();const row=store.save('guild-a','youtube','@creator','channel-a',null,'',2);
    assert.equal(store.get(row.id,'guild-a').role_slot,2);
    const settings=require('../database/guildSettings');
    for (let i=1;i<=4;i++)assert.ok(settings.getEditablePaths().includes(`Notify.PingRole${i}`));
});

test('ping settings validate IDs and merge safely into existing server configuration',() => {
    db.exec("CREATE TABLE IF NOT EXISTS settings(guild_id TEXT PRIMARY KEY,prefix TEXT,config_json TEXT,config_source TEXT,updated_at INTEGER)");
    const settings=require('../database/guildSettings');
    const roleId='1'.repeat(18);
    assert.throws(()=>settings.updateValue('guild-settings','Notify.PingRole1','invalid'));
    settings.updateValue('guild-settings','Notify.PingRole1',roleId);
    assert.equal(settings.getGuildConfig('guild-settings').Notify.PingRole1,roleId);
    assert.equal(settings.getGuildConfig('guild-settings').Notify.PingRole4,'');
    settings.updateValue('guild-settings','Notify.PingRole1','geen');
    assert.equal(settings.getGuildConfig('guild-settings').Notify.PingRole1,'');
});

test('same YouTube creator is fetched once per tick but delivered independently to two guilds',async()=>{
    reset();let fetches=0;const sent=[];
    const rows=['guild-a','guild-b'].map(g=>store.save(g,'youtube','@shared','channel-'+g));
    for(const row of rows)store.ingest(row,[],100);
    const guilds=rows.map(row=>{
        const guild={id:row.guild_id,members:{me:{}}};
        const channel={type:ChannelType.GuildText,guild,permissionsFor:()=>({has:()=>true}),send:async()=>sent.push(guild.id)};
        guild.channels={fetch:async()=>channel};return [guild.id,guild];
    });
    const client={isReady:()=>true,channels:{fetch:async()=>null},guilds:{cache:new Map(guilds)}};
    const original=providers.youtube;
    providers.youtube=async()=>{fetches++;return {items:[item('shared-new',101)]};};
    try{
        for(const row of rows)service.retry(row.id);
        service.startNotify(client);for(let i=0;i<30;i++)await new Promise(resolve=>setImmediate(resolve));await service.stopNotify();
        assert.equal(fetches,1);assert.deepEqual(sent,['guild-a','guild-b']);
        for(const row of rows)assert.equal(store.pending(row.id).length,0);
    }finally{providers.youtube=original;await service.stopNotify();}
});
