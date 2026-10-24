"use strict";
const { spawn } = require('node:child_process');
const { existsSync } = require('node:fs');
const { tr } = require('../utils/localization');
const logger = require('../utils/logger');
const sessions = new Map();
const locks = new Set();
const installed = new WeakSet();
function validateUrl(value) {
    let url;
    try { url = new URL(value); } catch { throw new Error(tr('Gebruik een volledige HTTP- of HTTPS-stream-URL.')); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || value.length > 1000)
        throw new Error(tr('Gebruik een volledige HTTP- of HTTPS-stream-URL.'));
    return url.href;
}
function bounded(value, fallback, min, max) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback;
}
function status(guildId) { return sessions.get(guildId); }
function stop(guildId, reason = 'gestopt') {
    const s = sessions.get(guildId);
    if (!s) return false;
    sessions.delete(guildId);
    clearTimeout(s.emptyTimer);
    s.player.stop(true);
    s.child?.stdout.destroy();
    s.child?.kill('SIGKILL');
    if (s.connection.state.status !== 'destroyed') s.connection.destroy();
    logger.info(`[Radio] ${s.guild.name} (${guildId}): ${reason}.`);
    return true;
}
function emptyCheck(s) {
    if (sessions.get(s.guild.id) !== s) return;
    const channel = s.guild.channels.cache.get(s.channelId);
    if (!channel) return stop(s.guild.id, 'spraakkanaal verwijderd');
    const occupied = channel.members.some(member => !member.user.bot);
    if (occupied) { clearTimeout(s.emptyTimer); s.emptyTimer = null; }
    else if (!s.emptyTimer) {
        s.emptyTimer = setTimeout(() => {
            s.emptyTimer = null;
            const current = s.guild.channels.cache.get(s.channelId);
            if (sessions.get(s.guild.id) === s && !current?.members.some(m => !m.user.bot)) stop(s.guild.id, 'kanaal leeg');
        }, s.emptySeconds * 1000);
        s.emptyTimer.unref();
    }
}
function install(client) {
    if (installed.has(client)) return;
    installed.add(client);
    client.on('voiceStateUpdate', (oldState, newState) => {
        const s = sessions.get(newState.guild.id);
        if (!s) return;
        if (newState.id === client.user.id && newState.channelId !== s.channelId) {
            stop(s.guild.id, 'bot verplaatst of verbinding verbroken');
        } else emptyCheck(s);
    });
    client.on('channelDelete', channel => {
        if (channel.guild && sessions.get(channel.guild.id)?.channelId === channel.id) stop(channel.guild.id, 'kanaal verwijderd');
    });
    client.on('guildDelete', guild => stop(guild.id, 'server verlaten'));
}
async function start(channel, station, options) {
    const v = require('@discordjs/voice');
    const url = validateUrl(station.Url);
    let executable = 'ffmpeg';
    try { const bundled = require('ffmpeg-static'); if (bundled && existsSync(bundled)) executable = bundled; } catch { /* system FFmpeg */ }
    stop(channel.guild.id, 'zender gewisseld');
    const connection = v.joinVoiceChannel({ channelId: channel.id, guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator, selfDeaf: true, selfMute: false });
    const player = v.createAudioPlayer({ behaviors: { noSubscriber: v.NoSubscriberBehavior.Stop } });
    const s = { guild: channel.guild, channelId: channel.id, name: station.Name || 'Radio', connection, player,
        volume: bounded(options.DefaultVolume, 30, 0, 100), emptySeconds: bounded(options.EmptySeconds, 60, 5, 3600), emptyTimer: null };
    sessions.set(channel.guild.id, s);
    const fail = reason => { if (sessions.get(channel.guild.id) === s) stop(channel.guild.id, reason); };
    player.on('error', () => fail('audiofout; controleer stream en FFmpeg'));
    connection.on('error', () => fail('verbindingsfout'));
    connection.on('stateChange', (_old, state) => {
        if (state.status === v.VoiceConnectionStatus.Disconnected || state.status === v.VoiceConnectionStatus.Destroyed)
            fail('spraakverbinding verbroken');
    });
    try {
        await v.entersState(connection, v.VoiceConnectionStatus.Ready, 20000);
        if (sessions.get(channel.guild.id) !== s) throw new Error('cancelled');
        // No shell. Limit FFmpeg input protocols to network audio, excluding local files and playlists.
        s.child = spawn(executable, ['-nostdin', '-hide_banner', '-loglevel', 'error',
            '-protocol_whitelist', 'http,https,tcp,tls,crypto', '-rw_timeout', '15000000',
            '-i', url, '-vn', '-f', 's16le', '-ar', '48000', '-ac', '2', 'pipe:1'], { stdio: ['ignore', 'pipe', 'ignore'] });
        s.child.on('error', () => fail('FFmpeg kon niet starten'));
        s.child.on('exit', code => { if (code !== 0 && code !== null) fail('stream kon niet worden afgespeeld'); });
        s.resource = v.createAudioResource(s.child.stdout, { inputType: v.StreamType.Raw, inlineVolume: true });
        s.resource.volume.setVolume(s.volume / 100);
        connection.subscribe(player);
        player.play(s.resource);
        player.on(v.AudioPlayerStatus.Idle, () => fail('stream beëindigd'));
        await v.entersState(player, v.AudioPlayerStatus.Playing, 20000);
        if (sessions.get(channel.guild.id) !== s) throw new Error('cancelled');
        emptyCheck(s);
        logger.info(`[Radio] ${s.guild.name} (${s.guild.id}): gestart in kanaal ${s.channelId}.`);
        return s;
    } catch {
        fail('start mislukt');
        throw new Error(tr('Radio starten mislukt. Controleer de directe stream-URL, FFmpeg en de spraakverbinding.'));
    }
}
function volume(guildId, value) {
    const s = sessions.get(guildId);
    if (!s?.resource) throw new Error(tr('Er speelt geen radio.'));
    s.volume = bounded(value, 30, 0, 100);
    s.resource.volume.setVolume(s.volume / 100);
    return s.volume;
}
async function exclusive(guildId, callback) {
    if (locks.has(guildId)) throw new Error(tr('Er wordt al een radio-opdracht uitgevoerd. Probeer zo opnieuw.'));
    locks.add(guildId);
    try { return await callback(); } finally { locks.delete(guildId); }
}
function stopAll() { for (const id of sessions.keys()) stop(id, 'bot wordt afgesloten'); }
module.exports = { validateUrl, bounded, status, stop, start, volume, exclusive, install, stopAll };
