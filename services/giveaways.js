const { tr, send } = require("../utils/localization");
const { MessageFlags } = require('discord.js');
const { randomInt, randomBytes } = require('node:crypto');
const store = require('../database/giveaways');
const { hasStaffRole, hasOwnerAccess, isDeveloper } = require('../utils/permissions');
const logger = require('../utils/logger');
const queues = new Map();
let timer;
const format = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
function parts(time) { return Object.fromEntries(format.formatToParts(time).filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)])); }
function localTime(p) {
    const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    return [60, 120].map(offset => wall - offset * 60000).filter(time => {
        const actual = parts(time);
        return ['year','month','day','hour','minute'].every(key => actual[key] === p[key]);
    });
}
function fail(message) { const e = new Error(message); e.giveawayInput = true; throw e; }
function parseEnd(text, now = Date.now()) {
    const m = /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})$/.exec(text.trim());
    if (!m) fail(tr("Gebruik DD-MM-JJJJ UU:MM, in Nederlandse tijd."));
    const [, d, mo, y, h, mi] = m;
    const times = localTime({ year: +y, month: +mo, day: +d, hour: +h, minute: +mi });
    if (times.length !== 1) fail(tr("Deze datum/tijd bestaat niet of valt dubbel bij de klokverzetting. Kies een andere tijd."));
    const current = parts(now);
    const maxDate = new Date(Date.UTC(current.year, current.month + 1, 1));
    const lastDay = new Date(Date.UTC(maxDate.getUTCFullYear(), maxDate.getUTCMonth() + 1, 0)).getUTCDate();
    const max = localTime({ ...current, year: maxDate.getUTCFullYear(), month: maxDate.getUTCMonth() + 1, day: Math.min(current.day, lastDay) });
    // The maximum can land in a DST gap: compare wall-clock calendar values instead.
    const wallMax = Date.UTC(maxDate.getUTCFullYear(), maxDate.getUTCMonth(), Math.min(current.day, lastDay), current.hour, current.minute);
    const wallEnd = Date.UTC(+y, +mo - 1, +d, +h, +mi);
    if (times[0] <= now || (max.length ? times[0] > Math.max(...max) : wallEnd > wallMax)) fail(tr("Kies een toekomstige einddatum, maximaal twee kalendermaanden vanaf nu."));
    return times[0];
}
function prizes(text) {
    const values = text.split('|').map(s => s.trim());
    if (values.length > 10 || values.some(s => !s || s.length > 80)) fail(tr("Vul 1 tot 10 prijzen in, gescheiden door |, maximaal 80 tekens per prijs."));
    return values;
}
function locked(id, action) {
    const task = (queues.get(id) || Promise.resolve()).catch(() => {}).then(action);
    queues.set(id, task);
    return task.finally(() => { if (queues.get(id) === task) queues.delete(id); });
}
function close(g, reason) {
    if (g.status !== 'open') return;
    const pool = [...new Set(g.participants)];
    g.winners = [];
    for (let n = 0; n < g.prizes.length && pool.length; n++) {
        const index = randomInt(pool.length);
        g.winners.push({ userId: pool[index], prize: g.prizes[n] });
        pool.splice(index, 1);
    }
    g.status = 'closed'; g.note = reason; g.closedAt = Date.now();
    // Persist the actual draw before any Discord request: retries never draw again.
    store.save(g);
}
function payload(g) {
    const ended = g.status !== 'open';
    const description = [g.text, '', tr("**Prijzen**"), ...g.prizes.map((p, n) => `${n + 1}. ${p}`), '',
        tr("Deelnemers: **{0}**", g.participants.length), ended ? g.note : tr("Eindigt <t:{0}:f> · <t:{1}:R>", Math.floor(g.endsAt / 1000), Math.floor(g.endsAt / 1000)),
        ended ? (g.winners.length ? tr("\n**Winnaars**\n") + g.winners.map(w => `<@${w.userId}> — ${w.prize}`).join('\n') : tr("\nGeen deelnemers, dus geen winnaar.")) : tr("Klik om mee te doen. Nogmaals klikken trekt je deelname in. Eén prijs per winnaar.")];
    return { embeds: [{ title: `🎁 ${g.title}`, description: description.join('\n'), color: ended ? 0x57F287 : 0x5865F2,
        footer: { text: tr("Giveaway-ID: {0} • {1}", g.id, ended ? tr("Afgelopen") : 'Open') } }],
        components: ended ? [] : [{ type: 1, components: [{ type: 2, style: 3, label: tr("🎉 Deelnemen / uitschrijven"), custom_id: `giveaway:${g.id}` }] }], allowedMentions: { parse: [] } };
}
function announcement(g) {
    const unused = g.prizes.length - g.winners.length;
    return { content: tr("🎉 **Uitslag giveaway #{0}: {1}**\n", g.id, g.title) +
        (g.winners.length ? g.winners.map((w, n) => tr("{0}. <@{1}> wint: {2}", n + 1, w.userId, w.prize)).join('\n') : tr("Er waren geen deelnemers. Er is geen winnaar getrokken.")) +
        (unused && g.winners.length ? tr("\n{0} prijs/prijzen niet verloot: onvoldoende unieke deelnemers.", unused) : ''),
        allowedMentions: { parse: [], users: g.winners.map(w => w.userId) },
        nonce: g.announcementNonce, enforceNonce: true };
}
async function sync(client, g) {
    if (!g.messageId) return;
    const channel = await client.channels.fetch(g.channelId);
    if (!channel || channel.guildId !== g.guildId || !channel.messages || typeof channel.send !== 'function') throw new Error(tr("Giveawaykanaal niet beschikbaar."));
    let message;
    try { message = await channel.messages.fetch(g.messageId); }
    catch (e) { if (Number(e.code) !== 10008) throw e; }
    if (g.status === 'cancelled') {
        if (message) {
            try { await message.delete(); } catch (e) { if (Number(e.code) !== 10008) throw e; }
        }
        store.save(g, false); return;
    }
    if (!message && g.status === 'open') {
        g.status = 'cancelled'; g.participants = []; g.note = tr("Giveawaybericht verwijderd.");
        store.save(g, false); return;
    }
    if (g.status === 'open' && g.endsAt <= Date.now()) close(g, tr("Automatisch afgelopen."));
    if (message) await send(message, "edit", payload(g));
    if (g.status === 'closed' && !g.announcementId) {
        const sent = await send(channel, "send", announcement(g));
        g.announcementId = sent.id;
    }
    store.save(g, false);
}
async function refresh(client, g) {
    try { await sync(client, g); return ''; }
    catch (e) {
        logger.warn(`Giveaway #${g.id}: ${e.message}. Opgeslagen; nieuwe poging volgt.`);
        return tr("\nOpgeslagen, maar Discord kon nog niet bijgewerkt worden. De bot probeert opnieuw; controleer de kanaalrechten.");
    }
}
async function guarded(i, action) {
    await i.deferReply({ flags: MessageFlags.Ephemeral });
    try { return await action(); }
    catch (e) { if (!e.giveawayInput) throw e; return send(i, "editReply", { content: e.message, allowedMentions: { parse: [] } }); }
}
async function command(client, i) {
    return guarded(i, async () => {
        if (!(hasStaffRole(i.member) || hasOwnerAccess(i.member, i.user.id) || isDeveloper(i.user.id))) fail(tr("Alleen staff, de servereigenaar en botbeheerders mogen giveaways beheren."));
        const action = i.options.getSubcommand();
        if (action === 'start') {
            const title = i.options.getString('titel').trim(), text = i.options.getString('tekst').trim();
            if (!title || !text) fail(tr("Vul een titel en tekst in."));
            const g = store.create({ guildId: i.guildId, channelId: i.channelId, messageId: null,
                title, text, prizes: prizes(i.options.getString('prijzen')), endsAt: parseEnd(i.options.getString('einddatum')),
                participants: [], winners: [], status: 'open', createdBy: i.user.id, note: '',
                announcementId: null, announcementNonce: randomBytes(12).toString('hex') });
            let message;
            try { message = await send(i.channel, "send", payload(g)); } catch (e) { store.remove(g.id); throw e; }
            g.messageId = message.id; store.save(g, false);
            return send(i, "editReply", tr("✅ Giveaway #{0} gestart: {1}", g.id, message.url));
        }
        const id = i.options.getInteger('id');
        return locked(id, async () => {
            const g = store.get(id);
            if (!g || g.guildId !== i.guildId) fail(tr("Deze giveaway bestaat niet in deze server."));
            if (g.status !== 'open') fail(tr("Deze giveaway is al afgesloten of geannuleerd."));
            if (action === 'annuleren') {
                g.status = 'cancelled'; g.participants = []; g.winners = []; g.note = tr("Geannuleerd zonder trekking.");
                store.save(g);
            } else { close(g, tr("Vroegtijdig gestopt door staff ({0}).", i.user.id)); }
            const warning = await refresh(client, g);
            return send(i, "editReply", tr("✅ Giveaway #{0}: {1}{2}", id, g.note, warning));
        });
    });
}
async function join(client, i) {
    return guarded(i, async () => {
        if (i.user.bot) fail(tr("Bots kunnen niet deelnemen."));
        const match = /^giveaway:(\d+)$/.exec(i.customId);
        if (!match) fail(tr("Ongeldige giveawayknop."));
        return locked(Number(match[1]), async () => {
            const g = store.get(Number(match[1]));
            if (!g || g.guildId !== i.guildId || g.messageId !== i.message.id) fail(tr("Deze giveaway is niet beschikbaar."));
            if (g.status !== 'open' || g.endsAt <= Date.now()) fail(tr("Deze giveaway is gesloten."));
            const index = g.participants.indexOf(i.user.id);
            if (index >= 0) g.participants.splice(index, 1); else g.participants.push(i.user.id);
            store.save(g);
            const warning = await refresh(client, g);
            return send(i, "editReply", (index >= 0 ? tr("Je deelname is ingetrokken.") : tr("🎉 Je doet mee aan de giveaway!")) + warning);
        });
    });
}
async function tick(client) {
    for (const item of store.pending()) {
        await locked(item.id, async () => { const g = store.get(item.id); if (g) await refresh(client, g); });
    }
}
function start(client) {
    if (timer) return;
    let busy = false;
    const run = async () => {
        if (busy) return; busy = true;
        try { await tick(client); } catch (e) { logger.warn(`Giveawaytimer: ${e.message}`); } finally { busy = false; }
    };
    timer = setInterval(run, 10000); timer.unref(); void run();
}
module.exports = { command, join, start, tick, parseEnd, prizes, payload, announcement };
