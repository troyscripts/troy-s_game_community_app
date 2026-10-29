'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const logs = [];
require.cache[require.resolve('../utils/logger')] = {exports:{warn: m => logs.push(m),info: m => logs.push(m)}};
const {Events} = require('discord.js');
const monitor = require('../services/connectionMonitor');
const {pinTime} = require('../services/logFilter');
test('pin timestamps support the actual numeric gateway event and invalid values', () => {
    assert.equal(pinTime(0), '1970-01-01T00:00:00.000Z');
    for (const value of [null, undefined, {}, NaN, 'invalid', new Date(NaN)]) assert.equal(pinTime(value), 'onbekend');
});
test('reconnect diagnostics distinguish Discord requests without leaking debug data; listeners cleaned up', () => {
    const client = new EventEmitter(); client.ws = {ping:130};
    monitor.startConnectionMonitor(client);
    const before = monitor.getSnapshot().samples;
    monitor.getSnapshot(); assert.equal(monitor.getSnapshot().samples,before);
    client.emit(Events.Debug,'[WS => Shard 0] Destroying shard\nReason: Told to reconnect by Discord\nSECRET SESSION');
    client.emit(Events.ShardReconnecting,0);
    assert.ok(logs.some(m => m.includes('oorzaak=Discord vraagt reconnect')));
    client.emit(Events.ShardResume,0,1);
    assert.ok(logs.some(m => m.includes('hersteltijd=')));
    client.emit(Events.Debug,'[WS => Shard 0] Destroying shard\nReason: Zombie connection');
    client.emit(Events.ShardReconnecting,0);
    assert.ok(logs.some(m => m.includes('Heartbeat-antwoord ontbreekt')));
    client.emit(Events.ShardError,{code:'ECONNRESET',message:'SECRET TOKEN'},0);
    assert.ok(logs.some(m => m.includes('ECONNRESET')));
    assert.ok(!logs.join('\n').includes('SECRET'));
    monitor.stopConnectionMonitor();
    for (const event of [Events.Debug,Events.ShardError,Events.ShardResume,Events.ShardReconnecting]) assert.equal(client.listenerCount(event),0);
});
test('YouTube API fallback validates channel identity, dates and hides the key from URLs', async () => {
    const providers = require('../services/notify/providers');
    const oldFetch = global.fetch, oldKey = process.env.YOUTUBE_API_KEY;
    const id='UC'+'x'.repeat(22), urls=[]; let mode='valid';
    process.env.YOUTUBE_API_KEY='TEST-PRIVATE-KEY';
    global.fetch=async (url,opts)=>{
        urls.push(url);
        if(new URL(url).hostname !== 'www.googleapis.com') return {ok:false,status:404};
        assert.equal(opts.headers['X-Goog-Api-Key'],'TEST-PRIVATE-KEY');
        if(mode==='quota') return {ok:false,status:403};
        const body=url.includes('/channels?') ? {items:[{id,contentDetails:{relatedPlaylists:{uploads:'UU'+'x'.repeat(22)}}}]} :
            {items:[{snippet:{channelId:mode==='wrong'?'UCwrong':id,title:'Test'},contentDetails:{videoId:'abcdefghijk',videoPublishedAt:'2026-10-29T12:00:00Z'}}]};
        return {ok:true,status:200,json:async()=>body};
    };
    try {
        const result=await providers.youtube({account:id});
        assert.equal(result.source,'api'); assert.equal(result.items.length,1);
        assert.equal(result.items[0].published,Date.parse('2026-10-29T12:00:00Z'));
        mode='wrong';await assert.rejects(()=>providers.youtube({account:id}),/kanaalidentiteit/);
        mode='quota';await assert.rejects(()=>providers.youtube({account:id}),e=>e.resolvedId===id && /HTTP 403/.test(e.message) && !e.message.includes('PRIVATE'));
        assert.ok(urls.every(url=>!url.includes('TEST-PRIVATE-KEY')));
    } finally {global.fetch=oldFetch;if(oldKey===undefined)delete process.env.YOUTUBE_API_KEY;else process.env.YOUTUBE_API_KEY=oldKey;}
});
