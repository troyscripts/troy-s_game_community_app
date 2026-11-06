const assert=require('node:assert/strict');
const Database=require('better-sqlite3');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createHub,deliver,enabled}=require('../services/notifyHub');
const {createStore}=require('../database/notifyHub');
const providers=require('../services/notify/providers');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'notify-hub-'));
const db=new Database(path.join(tmp,'hub.sqlite'));
const local1=new Database(path.join(tmp,'one.sqlite')),local2=new Database(path.join(tmp,'two.sqlite'));
let now=1800000000000,calls=0,fail=false,live=true;
const uc='UC'+'a'.repeat(22), video='abcdefghijk';
const source={platform:'youtube',account:'@creator'};
const guild='111111111111111111',channel='222222222222222222';
const fake={account:providers.account,
 youtube:async row=>{calls++;if(fail)throw Error('provider down');return {resolvedId:uc,items:Array.from({length:25},(_,n)=>({id:n?String(n).padStart(11,'0'):video,published:now-100000+n,title:'Video',url:'https://www.youtube.com/watch?v='+video}))};},
 twitch:async()=>({resolvedId:'1234',items:live?[{id:'8765',title:'Live',published:now-1000,url:'https://www.twitch.tv/creator'}]:[]}),
 tiktok:async()=>{throw Error('Wacht op TikTok-accountkoppeling');}
};
let hub=createHub(db,fake,()=>now);
const rpc=bot=>(action,data)=>hub.handle(bot,action,data);
(async()=>{
 assert.equal(enabled(),false);
 const first=await hub.handle('one','notify-register',source);
 const same=await hub.handle('two','notify-register',{...source,account:'https://www.youtube.com/@Creator'});
 assert.equal(first.id,same.id);assert.equal(same.reused,true);
 await hub.settle();assert.equal(calls,1);
 const canonical=await hub.handle('two','notify-register',{...source,account:uc});assert.equal(canonical.id,first.id);
 let page=await hub.handle('one','notify-feed',source);assert.equal(page.items.length,10);assert.equal(page.next,10);
 const page2=await hub.handle('two','notify-feed',{...source,offset:10,revision:page.revision,sourceId:page.id});assert.equal(page2.items.length,10);assert.equal(calls,1);
 assert.equal((await hub.handle('two','notify-feed',{...source,offset:10,revision:0})).pending,true);
 await assert.rejects(hub.handle('one','notify-feed',{...source,offset:-1}));
 await assert.rejects(hub.handle('one','notify-register',{platform:'youtube',account:'https://evil.test/@name'}));
 const row={guild_id:guild,channel_id:channel,...source};
 let sent=0;
 const send=async()=>{sent++;return {id:'333333333333333333'};};
 await Promise.all([deliver(row,{id:video},send,rpc('one'),createStore(local1)),deliver(row,{id:video},send,rpc('two'),createStore(local2))].map(p=>p.catch(e=>{assert.match(e.message,/gereserveerd/);})));assert.equal(sent,1);
 await deliver(row,{id:video},send,rpc('two'),createStore(local2));assert.equal(sent,1);
 await deliver({...row,channel_id:'444444444444444444'},{id:video},send,rpc('two'),createStore(local2));assert.equal(sent,2);
 // Lost acknowledgement is retried without resending.
 let dropped=false;
 const flaky=async(action,data)=>{const result=await rpc('one')(action,data);if(action==='notify-ack'&&!dropped){dropped=true;throw Error('lost reply');}return result;};
 await assert.rejects(deliver(row,{id:'00000000001'},send,flaky,createStore(local1)),/lost reply/);
 const after=sent;await deliver(row,{id:'00000000001'},send,rpc('one'),createStore(local1));assert.equal(sent,after);
 // Uncertain send is never repeated, including by another bot.
 await assert.rejects(deliver(row,{id:'00000000002'},async()=>{throw Error('timeout');},rpc('one'),createStore(local1)));
 await assert.rejects(deliver(row,{id:'00000000002'},send,rpc('one'),createStore(local1)),/Onzekere/);
 await assert.rejects(deliver(row,{id:'00000000002'},send,rpc('two'),createStore(local2)),/gereserveerd/);assert.equal(sent,after);
 // A definitive rejection permits a later retry.
 await assert.rejects(deliver(row,{id:'00000000003'},async()=>{throw Object.assign(Error('permissions'),{status:403});},rpc('one'),createStore(local1)));
 await deliver(row,{id:'00000000003'},send,rpc('two'),createStore(local2));assert.equal(sent,after+1);
 await deliver(row,{id:'00000000003'},send,rpc('one'),createStore(local1));assert.equal(sent,after+1);
 // An orphaned reservation becomes uncertain and is never reassigned.
 const abandoned={...source,guildId:guild,channelId:channel,itemId:'00000000005',token:createStore(local1).newToken()};
 assert.equal((await hub.handle('one','notify-claim',abandoned)).state,'claimed');
 db.prepare("UPDATE notify_hub_deliveries SET updated_at=0 WHERE token=?").run(abandoned.token);
 const abandonedResult=await hub.handle('two','notify-claim',{...abandoned,token:createStore(local2).newToken()});
 assert.equal(abandonedResult.outcome,'uncertain');
 // Existing local pending videos can be claimed even if outside the current RSS window.
 await deliver(row,{id:'oldvideo123'},send,rpc('one'),createStore(local1));assert.equal(sent,after+2);
 // Offline hub never falls back to an uncoordinated send.
 await assert.rejects(deliver(row,{id:'00000000004'},send,async()=>{throw Error('hub offline');},createStore(local1)),/hub offline/);
 // Registry and reservations survive hub reconstruction.
 await hub.stop();hub=createHub(db,fake,()=>now);
 assert.equal((await hub.handle('one','notify-register',source)).id,first.id);
 await deliver(row,{id:video},send,rpc('two'),createStore(local2));assert.equal(sent,after+2);
 now+=301000;fail=true;
 assert.equal((await hub.handle('one','notify-feed',source)).pending,true);await hub.settle();
 assert.match((await hub.handle('one','notify-feed',source)).error,/provider down/);
 const twitch={platform:'twitch',account:'creator'};
 await hub.handle('one','notify-register',twitch);await hub.settle();
 live=false;now+=301000;await hub.handle('one','notify-feed',twitch);await hub.settle();
 const token=createStore(local1).newToken();
 assert.equal((await hub.handle('one','notify-claim',{...twitch,guildId:guild,channelId:channel,itemId:'8765',token})).state,'inactive');
 await hub.handle('one','notify-register',{platform:'tiktok',account:'creator'});await hub.settle();
 assert.match((await hub.handle('one','notify-feed',{platform:'tiktok',account:'creator'})).error,/TikTok/);
 // Requests use the existing authenticated, encrypted broadcast transport.
 const transport=require('../services/broadcastTransport');
 const {handlerFor}=require('../services/broadcastNetwork');
 const options={secret:'ab'.repeat(32),botIds:['one','two']};
 const server=transport.createServer(options,handlerFor({},hub));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {
  options.url=`http://127.0.0.1:${server.address().port}/`;
  const shared=await transport.request(options,'two','notify-register',source);assert.equal(shared.id,first.id);
  await assert.rejects(transport.request({...options,secret:'cd'.repeat(32)},'two','notify-register',source));
  await assert.rejects(transport.request(options,'unlisted','notify-register',source));
  await assert.rejects(transport.request(options,'two','notify-publish',source));
 } finally {await new Promise(resolve=>server.close(resolve));}
 console.log('PASS: shared registry, URL/handle/UC aliases, one provider check, paging, persistence, per-channel deduplication, receipts, timeouts, retries and hub outage.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await hub.stop();db.close();local1.close();local2.close();fs.rmSync(tmp,{recursive:true,force:true});});
