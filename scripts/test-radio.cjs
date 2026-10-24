'use strict';
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const defaults = require('../config/defaults');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'troy-radio-'));
defaults.Database.File = path.join(tmp, 'test.sqlite'); defaults.Logging.Enabled = false;
const database = require('../database/database'); database.initializeDatabase();
const settings = require('../database/guildSettings');
const config = require('../config/config');
const { Collection, ChannelType, PermissionsBitField, PermissionFlagsBits: P } = require('discord.js');
const childProcess = require('node:child_process');
const originalSpawn = childProcess.spawn;
let spawned = [], failConnection = false;
childProcess.spawn = () => { const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.kill = () => {child.killed = true;}; spawned.push(child); return child; };
const voicePath = require.resolve('@discordjs/voice');
const oldVoice = require.cache[voicePath];
require.cache[voicePath] = { id: voicePath, filename: voicePath, loaded: true, exports: {
    VoiceConnectionStatus: { Ready:'ready', Disconnected:'disconnected', Destroyed:'destroyed' },
    AudioPlayerStatus: { Playing:'playing', Idle:'idle' }, StreamType:{Raw:'raw'}, NoSubscriberBehavior:{Stop:'stop'},
    joinVoiceChannel() { const c = new EventEmitter(); c.state={status:'ready'}; c.subscribe=()=>{}; c.destroy=()=>{c.state={status:'destroyed'};c.emit('stateChange',{},c.state);}; return c; },
    createAudioPlayer() { const p=new EventEmitter();p.play=()=>{};p.stop=()=>{p.stopped=true;p.emit('idle');};return p; },
    createAudioResource() { return { volume: {setVolume(v){this.value=v;}}}; },
    async entersState(c) { if(failConnection) throw Error('connection timeout');return c; }
}};
const radio = require('../services/radioService');
const panel = require('../services/radioPanel');
const command = require('../commands/community/radio');
function guild(id) {
    const g={id,name:'Test '+id,voiceAdapterCreator:{},members:{},channels:{cache:new Collection()}};
    const member={id:'user',user:{id:'user',bot:false},permissions:new PermissionsBitField(),roles:{cache:new Collection()},voice:{channelId:'voice'}};
    const channel={id:'voice',guild:g,type:ChannelType.GuildVoice,full:false,members:new Collection([['user',member]]),permissionsFor:()=>new PermissionsBitField([P.ViewChannel,P.Connect,P.Speak,P.SendMessages,P.EmbedLinks])};
    member.voice.channel=channel;g.members.fetch=async()=>member;g.members.me={voice:{channelId:null}};g.channels.cache.set('voice',channel);
    return {g,member,channel};
}
function interaction(f, sub, args={}) {
    return {guild:f.g,guildId:f.g.id,channel:f.channel,channelId:f.channel.id,member:f.member,user:{id:'user'},inGuild:()=>true,
        options:{getSubcommand:()=>sub,getInteger:name=>args[name]??1,getString:name=>args[name]},
        async deferReply(){this.deferred=true;},async editReply(data){this.result=data;},async reply(data){this.result=data;}};
}
(async()=>{
    try {
        assert.ok(radio.ffmpegArgs('https://example.com/live').includes('http,https,tcp,tls,crypto,httpproxy'));
        const secret = radio.safeDiagnostic('Error https://user:pass@example.com/live?token=hidden\n token=private');
        assert.ok(!secret.includes('hidden') && !secret.includes('private') && !secret.includes('user:pass'));
        assert.equal(command.data.toJSON().options.length,7);
        assert.equal(require('../commands/community/leave').data.toJSON().name,'leave');
        const ui=panel.payload(defaults.Radio);
        assert.equal(ui.components[0].components[0].options.length,12);
        assert.equal(ui.components[1].components.length,4);
        const {payload:localize}=require('../utils/localization');
        assert.equal(localize(ui,'en').components[0].components[0].placeholder,'Choose a radio station');
        assert.equal(Object.keys(defaults.Radio.Stations).length,25);
        for(const url of ['file:///etc/passwd','ftp://example.com','https://user:pass@example.com/','not a url']) assert.throws(()=>radio.validateUrl(url));
        assert.equal(radio.validateUrl('https://example.com/live'),'https://example.com/live');
        assert.equal(radio.validateUrl('https://www.radioveronica.nl/?utm_source=nederland.fm'), 'https://playerservices.streamtheworld.com/api/livestream-redirect/VERONICA.mp3');
        assert.equal(radio.validateUrl('https://www.radioveronica.nl.evil.example/'), 'https://www.radioveronica.nl.evil.example/');
        settings.ensureGuild('a');settings.ensureGuild('b');
        settings.updateValue('a','Radio.DefaultVolume','70');
        assert.equal(settings.getGuildConfig('a').Radio.DefaultVolume,70);
        assert.equal(settings.getGuildConfig('b').Radio.DefaultVolume,30);
        for(const value of ['101','-1','1.5']) assert.throws(()=>settings.updateValue('a','Radio.DefaultVolume',value));
        settings.updateValue('a','Radio.Stations.Station25.Url','https://example.com/live');
        assert.equal(settings.getGuildConfig('b').Radio.Stations.Station25.Url,'');
        let release;const pending=radio.exclusive('busy',()=>new Promise(resolve=>{release=resolve;}));
        await assert.rejects(radio.exclusive('busy',async()=>{}));release();await pending;
        await radio.exclusive('busy',async()=>{});
        const a=guild('a'),b=guild('b'),client=new EventEmitter();client.user={id:'bot'};
        radio.install(client);radio.install(client);assert.equal(client.listenerCount('voiceStateUpdate'),1);
        const s=await radio.start(a.channel,defaults.Radio.Stations.Station1,defaults.Radio);
        await radio.start(b.channel,defaults.Radio.Stations.Station1,defaults.Radio);
        assert.equal(radio.volume('a',200),100);assert.equal(radio.status('b').volume,30);
        const replacement=await radio.start(a.channel,defaults.Radio.Stations.Station2,defaults.Radio);
        assert.equal(s.child.killed,true);assert.equal(s.connection.state.status,'destroyed');assert.equal(radio.status('a'),replacement);
        const old=a.member.voice.channelId;a.member.voice.channelId='elsewhere';a.member.voice.channel={id:'elsewhere',type:ChannelType.GuildVoice};
        const wrong=interaction(a,'stop');await require('../commands/community/leave').execute(client,wrong);
        assert.ok(radio.status('a'));assert.match(wrong.result.content,/ander kanaal/);
        a.member.voice.channelId=old;a.member.voice.channel=a.channel;
        const leave=interaction(a,'stop');await require('../commands/community/leave').execute(client,leave);
        assert.equal(radio.status('a'),undefined);assert.equal(replacement.child.killed,true);assert.equal(replacement.connection.state.status,'destroyed');assert.ok(radio.status('b'));
        const bSession=radio.status('b');bSession.player.emit('error',Error('bad stream'));assert.equal(radio.status('b'),undefined);assert.equal(bSession.child.killed,true);
        failConnection=true;await assert.rejects(radio.start(a.channel,defaults.Radio.Stations.Station1,defaults.Radio));assert.equal(radio.status('a'),undefined);failConnection=false;
        const muted=interaction(a,'instellen',{zender:1,naam:'Override',url:'https://example.com/live'});await command.execute(client,muted);assert.match(muted.result.content,/beheerders/);
        const click=interaction(a,'start');click.customId='radio:select';click.channelId='different';await command.run(client,click,{sub:'start',slot:1});assert.equal(radio.status('a'),undefined);
        a.channel.permissionsFor=()=>new PermissionsBitField();const denied=interaction(a,'start');await command.execute(client,denied);assert.match(denied.result.content,/Spreken/);assert.equal(radio.status('a'),undefined);
        // A delayed callback from a replaced player must not stop the current session.
        await radio.start(a.channel,defaults.Radio.Stations.Station1,defaults.Radio);
        s.player.emit('error',Error('old'));assert.ok(radio.status('a'));
        const active=radio.status('a');a.channel.members.clear();
        client.emit('voiceStateUpdate',{}, {guild:a.g,id:'user',channelId:null});assert.ok(active.emptyTimer);
        active.emptyTimer._onTimeout();assert.equal(radio.status('a'),undefined);assert.equal(active.child.killed,true);
        console.log('Radio: paneel, lokalisatie, serverisolatie, rechten, /leave, foutopruiming en leeg kanaal geslaagd.');
    } finally {
        radio.stopAll();childProcess.spawn=originalSpawn;
        if(oldVoice)require.cache[voicePath]=oldVoice;else delete require.cache[voicePath];
        database.db.close();fs.rmSync(tmp,{recursive:true,force:true});
    }
})().catch(error=>{console.error(error);process.exitCode=1;});
