'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { test } = require('node:test');
const root = path.join(__dirname, '..');
function connection(fetch, env = { GROQ_API_KEY: 'test-key' }) {
    const box = { module: { exports: {} }, process: { env }, fetch, AbortSignal, Date };
    vm.runInNewContext(fs.readFileSync(path.join(root, 'services/groqConnection.js'), 'utf8'), box);
    return box.module.exports;
}
test('Groq request sends only supported fields and returns final text', async () => {
    const api = connection(async (url, options) => {
        assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
        assert.equal(options.redirect, 'error');
        assert.equal(options.headers.Authorization, 'Bearer test-key');
        const body = JSON.parse(options.body);
        assert.equal(body.model, 'openai/gpt-oss-20b');
        assert.equal(body.include_reasoning, false);
        assert.equal(body.reasoning_effort, 'low');
        assert.equal(body.max_completion_tokens, 1024);
        assert.equal(body.keep_alive, undefined);
        return { ok: true, json: async () => ({ choices: [{ message: { content: 'Hallo!', reasoning: 'private' } }] }) };
    });
    const result = await api.requestChat({ messages: [{ role: 'user', content: 'Hoi' }] });
    assert.equal(result.message.content, 'Hallo!');
    assert.equal(JSON.stringify(result).includes('private'), false);
});
test('Missing key never makes a network request', async () => {
    await assert.rejects(connection(() => { throw new Error('Unexpected network'); }, {}).requestChat({ messages: [] }), { code: 'AI_CONFIG' });
});
test('Auth failures never expose provider response or key', async () => {
    const api = connection(async () => ({ ok: false, status: 401, headers: new Headers(), body: { cancel: async () => {} } }));
    await assert.rejects(api.requestChat({ messages: [] }), error => error.code === 'AI_AUTH' && !error.message.includes('test-key'));
});
test('Rate limit observes retry-after and blocks the next network request', async () => {
    let calls = 0;
    const api = connection(async () => {
        calls++;
        return { ok: false, status: 429, headers: new Headers({ 'retry-after': '120' }), body: { cancel: async () => {} } };
    });
    await assert.rejects(api.requestChat({ messages: [] }), e => e.code === 'AI_RATE_LIMIT' && e.retryAfter === 120);
    await assert.rejects(api.requestChat({ messages: [] }), { code: 'AI_RATE_LIMIT' });
    assert.equal(calls, 1);
});
function chat(api) {
    const config = { Prefix: '!', Counting: {}, AIChat: { Enabled: true, Channels: ['1','2'], Mode: 'mention', HistoryTurns: 2 } };
    const box = { module: { exports: {} }, require(name) {
        if (name === 'discord.js') return { PermissionFlagsBits: { ViewChannel: 1, SendMessages: 2, SendMessagesInThreads: 3 } };
        if (name === '../config/config') return config;
        if (name === '../utils/logger') return { warn() {}, startup() {} };
        if (name === './groqConnection') return { requestChat: api, getModel: () => 'openai/gpt-oss-20b' };
        throw Error(name);
    } };
    vm.runInNewContext(fs.readFileSync(path.join(root, 'services/aiChat.js'), 'utf8'), box);
    return { ...box.module.exports, config };
}
function message(channel = '1') {
    const replies = [];
    return { guild: { id: '10' }, author: { id: '20' }, content: '<@99> Hallo',
        channel: { id: channel, permissionsFor: () => ({ has: () => true }), sendTyping: async () => {} },
        reply: async value => replies.push(value), replies };
}
const client = { user: { id: '99' } };
test('Discord integration returns Dutch final text, strips reasoning and disables mentions', async () => {
    const service = chat(async body => {
        assert.equal(body.messages.at(-1).content, 'Hallo');
        return { message: { content: '<think>secret</think>Hallo Troy!' } };
    });
    const msg = message();
    assert.equal(await service.processAIMessage(client, msg), true);
    assert.equal(msg.replies[0].content, 'Hallo Troy!');
    assert.equal(msg.replies[0].allowedMentions.parse.length, 0);
});
test('Provider limit pauses other channels without repeated errors or requests', async () => {
    let calls = 0;
    const service = chat(async () => { calls++; throw Object.assign(new Error('rate'), { code: 'AI_RATE_LIMIT', retryAfter: 120 }); });
    const first = message();
    await service.processAIMessage(client, first);
    assert.match(first.replies[0].content, /gebruikslimiet/);
    const second = message('2');
    await service.processAIMessage(client, second);
    assert.equal(calls, 1);
    assert.equal(second.replies.length, 0);
});
test('Disabled AI, unconfigured channels and missing mentions do not call provider', async () => {
    const service = chat(async () => { throw Error('Unexpected provider call'); });
    const msg = message('3');
    assert.equal(await service.processAIMessage(client, msg), false);
    msg.channel.id = '1'; msg.content = 'zonder vermelding';
    assert.equal(await service.processAIMessage(client, msg), false);
    msg.content = '<@99> Hallo'; service.config.AIChat.Enabled = false;
    assert.equal(await service.processAIMessage(client, msg), false);
});
