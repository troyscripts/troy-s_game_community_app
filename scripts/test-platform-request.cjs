'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {platformRequest,networkReason} = require('../utils/platformRequest');
const providers = require('../services/notify/providers');
const ok = text => ({ok:true,status:200,text:async()=>text});
test('GET retries nested network failures and preserves useful safe codes',async()=>{
    let calls=0;
    const error=new TypeError('secret-token',{cause:new AggregateError([Object.assign(new Error(),{code:'ETIMEDOUT'}),Object.assign(new Error(),{code:'ENETUNREACH'})])});
    assert.equal(networkReason(error),'ETIMEDOUT, ENETUNREACH');
    const result=await platformRequest('https://www.youtube.com/feed',{}, {wait:async()=>{},fetchImpl:async()=>{if(++calls===1)throw error;return ok('feed');}});
    assert.equal(calls,2);assert.equal(result.data,'feed');
    await assert.rejects(platformRequest('https://www.youtube.com/feed',{}, {wait:async()=>{},fetchImpl:async()=>{throw error;}}),e=>e.message.includes('ETIMEDOUT')&&!e.message.includes('secret-token'));
});
test('GET redirects stay on allowed HTTPS hosts; loops and external redirects stop',async()=>{
    let calls=0;
    const redirected=location=>({status:302,headers:{get:()=>location}});
    const result=await platformRequest('https://www.youtube.com/feed',{}, {fetchImpl:async(url,opts)=>{assert.equal(opts.redirect,'manual');return ++calls===1?redirected('/next'):ok('good');}});
    assert.equal(result.data,'good');assert.equal(calls,2);
    for(const target of ['https://evil.example/path','http://www.youtube.com/path','https://user:pass@www.youtube.com/path']){
        calls=0;
        await assert.rejects(platformRequest('https://www.youtube.com/feed',{}, {fetchImpl:async()=>{calls++;return redirected(target);}}),/geweigerd/);
        assert.equal(calls,1);
    }
    await assert.rejects(platformRequest('https://www.youtube.com/feed',{}, {fetchImpl:async()=>redirected('/loop')}),/te veel/);
});
test('POST token requests are never automatically retried or redirected',async()=>{
    let calls=0;
    await assert.rejects(platformRequest('https://open.tiktokapis.com/token',{method:'POST'}, {fetchImpl:async()=>{calls++;throw Object.assign(new Error(),{code:'ECONNRESET'});}}),/ECONNRESET/);
    assert.equal(calls,1);
});
test('transient 503 retries; 429 is left to scheduler backoff',async()=>{
    for(const status of [503,429]){
        let calls=0;
        const {response}=await platformRequest('https://api.github.com/test',{}, {wait:async()=>{},fetchImpl:async()=>{calls++;return {status,text:async()=>''};}});
        assert.equal(response.status,status);assert.equal(calls,status===503?2:1);
    }
});
test('timeout also covers response body',async()=>{
    const keepAlive=setTimeout(()=>{},1000);
    try{
        await assert.rejects(platformRequest('https://api.github.com/test',{method:'POST'}, {timeoutMs:10,fetchImpl:async(url,{signal})=>({text:()=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}))})}),/TIMEOUT/);
    }finally{clearTimeout(keepAlive);}
});
test('YouTube handle resolution and feed survive same-platform redirect',async()=>{
    const old=global.fetch;const id='UC'+'a'.repeat(22);let calls=0;
    global.fetch=async url=>{
        calls++;
        if(url.includes('/@'))return {status:302,headers:{get:()=>`/channel/${id}`}};
        if(url.includes('/channel/'))return ok(`<link href="https://www.youtube.com/channel/${id}">`);
        return ok(`<feed><yt:channelId>${id}</yt:channelId></feed>`);
    };
    try{assert.deepEqual(await providers.youtube({account:'@creator'}),{resolvedId:id,items:[]});assert.equal(calls,3);}
    finally{global.fetch=old;}
});

test('YouTube consent cookie stays on YouTube and external consent redirects remain blocked',async()=>{
    const original=global.fetch;let calls=0;
    global.fetch=async(url,opts)=>{
        calls++;
        if(url.includes('youtube.com')){
            assert.equal(opts.headers.Cookie,'SOCS=CAI');
            return ok('<feed/>');
        }
        assert.equal(opts.headers.Cookie,undefined);
        return {ok:true,status:200,json:async()=>({error:{code:'ok'}})};
    };
    try{
        await providers.request('https://www.youtube.com/feed',{},false);
        await providers.request('https://open.tiktokapis.com/v2/user/info/',{headers:{Authorization:'Bearer fixture'}});
        assert.equal(calls,2);
        calls=0;
        global.fetch=async()=>{calls++;return {status:302,headers:{get:()=> 'https://consent.youtube.com/m?secret=never-log-this'}};};
        await assert.rejects(providers.request('https://www.youtube.com/feed',{},false),e=>e.message.includes('consent.youtube.com')&&!e.message.includes('never-log-this'));
        assert.equal(calls,1);
    }finally{global.fetch=original;}
});

test('live YouTube feed format without UC prefix keeps exact channel validation',()=>{
    const id='UCDlLQNjJaaveIVlMzDW5NAg';
    const xml=`<feed><yt:channelId>${id.slice(2)}</yt:channelId><entry><yt:videoId>abcdefghijk</yt:videoId><title>Video</title><published>2026-09-30T12:00:00Z</published></entry></feed>`;
    assert.equal(providers.parseFeed(xml,id).length,1);
    assert.throws(()=>providers.parseFeed(xml,'UC'+'b'.repeat(22)),/ingestelde kanaal/);
    assert.throws(()=>providers.parseFeed('<feed><yt:channelId></yt:channelId></feed>',id),/ingestelde kanaal/);
});
