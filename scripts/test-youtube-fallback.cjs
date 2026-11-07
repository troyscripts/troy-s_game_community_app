'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
// No network or credentials needed: exercise the provider's fallback state machine.
require.cache[require.resolve('../utils/localization')] = {exports:{tr:(value,...args)=>value.replace(/\{(\d+)\}/g,(_,n)=>args[n])}};
let rssOk=false, apiOk=true, rssCalls=0, apiCalls=0;
const id='UC'+'z'.repeat(22);
require.cache[require.resolve('../utils/platformRequest')] = {exports:{platformRequest:async()=>{
    rssCalls++;
    return {response:{ok:rssOk,status:rssOk?200:404},data:rssOk?`<feed><yt:channelId>${id}</yt:channelId></feed>`:null};
}}};
require.cache[require.resolve('../services/notify/youtubeApi')] = {exports:{youtubeApi:async channel=>{
    apiCalls++; assert.equal(channel,id);
    if(!apiOk) throw new Error('API unavailable');
    return {resolvedId:channel,items:[],source:'api'};
}}};
const {youtube}=require('../services/notify/providers');
test('YouTube API preference expires, recovers via RSS, preserves errors and respects removed key',async()=>{
    const oldKey=process.env.YOUTUBE_API_KEY, oldNow=Date.now;
    let now=100000;Date.now=()=>now;
    try {
        process.env.YOUTUBE_API_KEY='test-only';
        assert.equal((await youtube({account:id})).source,'api');
        assert.equal(rssCalls,2);assert.equal(apiCalls,1);
        await youtube({account:'@alias',resolved_id:id});
        assert.equal(rssCalls,2);assert.equal(apiCalls,2);
        now+=3600001;rssOk=true;
        assert.equal((await youtube({account:id})).source,undefined);
        assert.equal(rssCalls,3);assert.equal(apiCalls,2);
        rssOk=false;await youtube({account:id}); // enable preference again
        apiOk=false;rssOk=true;
        assert.equal((await youtube({account:id})).source,undefined);
        assert.equal(apiCalls,4);assert.equal(rssCalls,6);
        apiOk=true;rssOk=false;await youtube({account:id});
        apiOk=false;const before=apiCalls;
        await assert.rejects(youtube({account:id}),e=>e.message==='API unavailable'&&e.resolvedId===id);
        assert.equal(apiCalls,before+1); // no second failed API request in same check
        apiOk=true;await youtube({account:id});
        delete process.env.YOUTUBE_API_KEY;
        const previous=apiCalls;
        await assert.rejects(youtube({account:id}),e=>e.status===404&&e.resolvedId===id&&e.message.includes('YOUTUBE_API_KEY'));
        assert.equal(apiCalls,previous);
        rssOk=true;assert.deepEqual((await youtube({account:id})).items,[]);
    } finally {
        Date.now=oldNow;
        if(oldKey===undefined)delete process.env.YOUTUBE_API_KEY;else process.env.YOUTUBE_API_KEY=oldKey;
    }
});
