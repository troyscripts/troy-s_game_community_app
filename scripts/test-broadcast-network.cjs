'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const {createStore} = require('../database/broadcastStore');
const transport = require('../services/broadcastTransport');
const {settings,CENTRAL_BOT_ID} = require('../config/broadcast');
const config = require('../config/config');
const load = Module._load;
Module._load = function(name,...args) {
    if(name==='../utils/logger') return {info(){},warn(){},error(){}};
    return load.call(this,name,...args);
};
const {handlerFor,deliver,flushReceipts,publish} = require('../services/broadcastNetwork');
Module._load=load;
function database(filename) {
    // Production uses better-sqlite3. Node's SQLite engine allows these same
    // SQL/state tests to run in a dependency-free validation environment too.
    try { const Database=require('better-sqlite3'); return new Database(filename); }
    catch(error) {
        if(error.code!=='MODULE_NOT_FOUND') throw error;
        const {DatabaseSync}=require('node:sqlite');
        const db=new DatabaseSync(filename);
        db.transaction=fn=>(...args)=>{
            db.exec('BEGIN IMMEDIATE');
            try { const result=fn(...args);db.exec('COMMIT');return result; }
            catch(error) {db.exec('ROLLBACK');throw error;}
        };
        return db;
    }
}
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'troy-broadcast-'));
const file=path.join(tmp,'queue.sqlite');
let db=database(file), server;
const bot1=CENTRAL_BOT_ID, bot2='222222222222222222', bot3='333333333333333333';
const g1='111111111111111111',g2='444444444444444444',g3='555555555555555555';
const secret=crypto.randomBytes(32).toString('hex');
(async()=>{
    assert.equal(settings({}).enabled,false);
    assert.throws(()=>settings({BROADCAST_ENABLED:'true'}),/SECRET/);
    const env={BROADCAST_ENABLED:'true',BROADCAST_SECRET:secret,BROADCAST_BOT_IDS:[bot1,bot2,bot3].join(',')};
    assert.equal(settings(env).centralBotId,bot1);
    assert.throws(()=>settings({...env,BROADCAST_PORT:'0'}),/PORT/);
    assert.throws(()=>settings({...env,BROADCAST_BOT_IDS:bot2}),/BOT_IDS/);
    assert.throws(()=>settings({...env,BROADCAST_POLL_SECONDS:'1'}),/POLL/);
    await assert.rejects(publish({},'attacker','hello','111111111111111111'),/boteigenaar/);
    const payload={kind:'request',body:'Private announcement @everyone'};
    const encrypted=transport.seal(secret,payload);
    assert.ok(!encrypted.includes(payload.body));
    assert.deepEqual(transport.open(secret,encrypted),payload);
    assert.throws(()=>transport.open(crypto.randomBytes(32).toString('hex'),encrypted));
    const tampered=JSON.parse(encrypted);tampered.tag=Buffer.alloc(16).toString('base64');
    assert.throws(()=>transport.open(secret,JSON.stringify(tampered)));
    let store=createStore(db);
    store.register(bot1,[g1]);store.register(bot2,[g1,g2]);store.register(bot3,[g3]);
    const message=store.publish('interaction-1','hello @everyone',[bot1,bot2,bot3]);
    assert.equal(message.total,3);
    assert.equal(store.publish('interaction-1','changed',[bot1,bot2,bot3]).id,message.id);
    const first=store.claim(bot1,[g1]);
    assert.ok(first);assert.equal(store.claim(bot2,[g1]),null,'shared guild cannot be reserved twice');
    assert.equal(store.acknowledge(bot2,{token:first.token,state:'sent'}),false,'wrong bot cannot acknowledge');
    assert.equal(store.acknowledge(bot1,{token:first.token,state:'sent',discordId:'777777777777777777'}),true);
    assert.equal(store.acknowledge(bot1,{token:first.token,state:'sent'}),true,'ack retry is idempotent');
    assert.equal(store.acceptNonce('persistent-nonce',Date.now()+120000),true);
    db.close();db=database(file);store=createStore(db);
    assert.equal(store.acceptNonce('persistent-nonce',Date.now()+120000),false,'replay protection survives hub restart');
    assert.equal(store.summary(message.id).sent,1);
    assert.equal(store.claim(bot2,[g1]),null,'restart does not resend sent guild');
    const offline=store.claim(bot3,[g3]);assert.ok(offline,'offline bot can claim after restart');
    store.acknowledge(bot3,{token:offline.token,state:'skipped'});
    const item=store.claim(bot2,[g2]);
    let sends=0, dropAck=true;
    const handler=handlerFor(store);
    config.__context.setProvider(()=>({...config.__context.defaults,Logging:{Channel:'888888888888888888',Enabled:false}}));
    const guild={id:g2,name:'Second server',channels:{fetch:async()=>({guild:{id:g2},isTextBased:()=>true,send:async p=>{
        sends++;assert.deepEqual(p.allowedMentions,{parse:[]});assert.equal(p.content,'hello @everyone');
        return {id:'999999999999999999'};
    }})}};
    const state={store,client:{guilds:{cache:new Map([[g2,guild]])}},call:async(action,data)=>{
        if(action==='ack' && dropAck) throw new Error('Connection lost');
        return handler(bot2,action,data);
    }};
    await assert.rejects(deliver(state,item),/Connection lost/);
    assert.equal(store.receipts()[0].state,'sent');assert.equal(sends,1);
    dropAck=false;await flushReceipts(state);
    assert.equal(sends,1);assert.equal(store.receipts().length,0);assert.equal(store.summary(message.id).sent,2);
    const next=store.publish('interaction-2','hello @everyone',[bot2]);
    const abandoned=store.claim(bot2,[g2]);store.beginReceipt(abandoned);
    await flushReceipts(state);
    assert.equal(store.summary(next.id).uncertain,1,'restart mid-send is not silently retried');
    // Two live HTTP receivers racing for one guild: one winner.
    store.publish('interaction-3','network',[bot1]);
    const options={secret,botIds:[bot1,bot2,bot3],url:''};
    server=transport.createServer(options,handler,store.acceptNonce);
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    options.url=`http://127.0.0.1:${server.address().port}`;
    const race=await Promise.all([transport.request(options,bot1,'claim',{guildIds:[g1]}),transport.request(options,bot2,'claim',{guildIds:[g1]})]);
    // There are two pending messages for g1; each is reserved exactly once.
    const winners=race.filter(Boolean);assert.equal(new Set(winners.map(x=>x.messageId+':'+x.guildId)).size,winners.length);
    const attempts=await Promise.all([transport.request(options,bot1,'claim',{guildIds:[g1]}),transport.request(options,bot2,'claim',{guildIds:[g1]})]);
    assert.equal(attempts.filter(Boolean).length,0);
    await assert.rejects(transport.request(options,bot2,'publish',{body:'forged'}),/Ongeldig/);
    await assert.rejects(transport.request({...options,secret:crypto.randomBytes(32).toString('hex')},bot2,'register',{guildIds:[g2]}),/sleutel/);
    await assert.rejects(transport.request(options,'666666666666666666','register',{guildIds:[g2]}),/sleutel/);
    const packet={kind:'request',botId:bot2,action:'register',data:{guildIds:[g2]},nonce:crypto.randomBytes(16).toString('hex'),time:Date.now()};
    const raw=transport.seal(secret,packet);
    const url=options.url+'/broadcast/v1';
    const one=await fetch(url,{method:'POST',body:raw});assert.equal(one.status,200);await one.text();
    const replay=await fetch(url,{method:'POST',body:raw});assert.equal(replay.status,401);await replay.text();
    const expired=await fetch(url,{method:'POST',body:transport.seal(secret,{...packet,nonce:crypto.randomBytes(16).toString('hex'),time:Date.now()-120000})});
    assert.equal(expired.status,401);await expired.text();
    console.log('PASS: config, AES authentication/encryption, replay protection, SQLite persistence, offline catch-up, atomic reservations, owner gate, read-only receiver API, lost acknowledgements and crash recovery.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
    if(server) await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});
    db.close();fs.rmSync(tmp,{recursive:true,force:true});
});
