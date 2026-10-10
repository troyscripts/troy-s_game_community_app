const { MessageFlags } = require('discord.js');
const store = require('../database/polls');
const { hasStaffRole, hasOwnerAccess, isDeveloper } = require('../utils/permissions');
const logger = require('../utils/logger');
const queues = new Map();
let timer;
function locked(id, action) {
    const previous = queues.get(id) || Promise.resolve();
    const task = previous.catch(() => {}).then(action);
    queues.set(id, task);
    return task.finally(() => { if (queues.get(id) === task) queues.delete(id); });
}
function fail(message) { const error = new Error(message); error.pollInput = true; throw error; }
function answers(text) {
    const values = text.split('|').map(value => value.trim());
    if (values.length < 2 || values.length > 10 || values.some(value => !value || value.length > 80)) {
        fail('Geef 2 tot 10 antwoorden, gescheiden door |. Elk antwoord moet 1 tot 80 tekens bevatten.');
    }
    if (new Set(values.map(value => value.toLocaleLowerCase('nl'))).size !== values.length) fail('Elk antwoord moet verschillend zijn.');
    return values;
}
function expire(poll) {
    if (poll.status === 'open' && poll.endsAt <= Date.now()) {
        poll.status = 'closed'; poll.closedAt = Date.now(); poll.note = 'Automatisch afgelopen.';
        store.save(poll);
    }
    return poll;
}
function payload(poll) {
    const cancelled = poll.status === 'cancelled';
    const counts = poll.options.map((_, index) => Object.values(poll.votes).filter(v => v.includes(index)).length);
    const voters = Object.keys(poll.votes).length;
    const status = { open: 'Open', closed: 'Afgelopen', cancelled: 'Geannuleerd' }[poll.status];
    const lines = poll.options.map((option, index) => `${index + 1}. ${option}${cancelled ? '' : ` — **${counts[index]}** stem(men)`}`);
    const end = Math.floor(poll.endsAt / 1000);
    const description = [poll.question, '', ...lines, '',
        poll.status === 'open' ? `Sluit <t:${end}:R> · <t:${end}:f>` : cancelled ? 'Deze poll is ongeldig. De stemmen zijn gewist.' : 'Stemmen is gesloten.',
        poll.multiple ? 'Meerdere antwoorden mogelijk. Klik opnieuw om je keuze te verwijderen.' : 'Eén antwoord per persoon. Klik een ander antwoord om te wisselen; klik opnieuw om je stem in te trekken.',
        `Deelnemers: **${voters}**`, poll.note || ''].join('\n');
    const components = [];
    if (poll.status === 'open') {
        for (let start = 0; start < poll.options.length; start += 5) {
            components.push({ type: 1, components: poll.options.slice(start, start + 5).map((_, offset) => ({
                type: 2, style: 1, label: `Antwoord ${start + offset + 1}`,
                custom_id: `poll:${poll.id}:${poll.revision}:${start + offset}`
            })) });
        }
    }
    return { embeds: [{ title: `📊 Poll #${poll.id} · ${status}`, description,
        color: cancelled ? 0xED4245 : poll.status === 'open' ? 0x5865F2 : 0x57F287,
        footer: { text: `Poll-ID: ${poll.id} • Gemaakt door ${poll.createdBy}` } }],
        components, allowedMentions: { parse: [] } };
}
async function sync(client, poll) {
    if (!poll.messageId) return;
    try {
        const channel = await client.channels.fetch(poll.channelId);
        if (!channel?.messages) throw new Error('Pollkanaal is niet beschikbaar.');
        const message = await channel.messages.fetch(poll.messageId);
        await message.edit(payload(poll));
        store.save(poll, false);
    } catch (error) {
        if ([10003, 10008].includes(Number(error.code))) {
            poll.status = 'cancelled'; poll.votes = {}; poll.note = 'Pollbericht of kanaal verwijderd.';
            store.save(poll, false);
        } else {
            logger.warn(`Poll #${poll.id} kon niet bijgewerkt worden: ${error.message}. Nieuwe poging volgt.`);
            throw error;
        }
    }
}
async function syncStatus(client, poll) {
    try { await sync(client, poll); return ''; }
    catch { return '\nDe wijziging is opgeslagen, maar het pollbericht kon nog niet worden bijgewerkt. De bot probeert het opnieuw; controleer de kanaalrechten.'; }
}
async function guarded(interaction, action) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try { return await action(); }
    catch (error) {
        if (!error.pollInput) throw error;
        return interaction.editReply({ content: error.message, allowedMentions: { parse: [] } });
    }
}
async function command(client, i) {
    return guarded(i, async () => {
        const action = i.options.getSubcommand();
        if (action !== 'maken' && !(hasStaffRole(i.member) || hasOwnerAccess(i.member, i.user.id) || isDeveloper(i.user.id))) {
            fail('Alleen staff, de servereigenaar en botbeheerders mogen polls beheren.');
        }
        if (action === 'maken') {
            const question = i.options.getString('vraag').trim();
            if (!question) fail('Vul een vraag in.');
            const poll = store.create({ guildId: i.guildId, channelId: i.channelId, messageId: null,
                question, options: answers(i.options.getString('antwoorden')), multiple: i.options.getBoolean('meerdere') || false,
                endsAt: Date.now() + i.options.getInteger('minuten') * 60000,
                createdBy: i.user.id, status: 'open', votes: {}, revision: 1, note: '' });
            let message;
            try { message = await i.channel.send(payload(poll)); }
            catch (error) { store.remove(poll.id); throw error; }
            poll.messageId = message.id;
            store.save(poll, false);
            return i.editReply(`✅ Poll #${poll.id} aangemaakt: ${message.url}`);
        }
        const id = i.options.getInteger('id');
        return locked(id, async () => {
            const poll = store.get(id);
            if (!poll || poll.guildId !== i.guildId) fail('Deze poll bestaat niet in deze server. Gebruik het Poll-ID onder het bericht.');
            expire(poll);
            if (action === 'annuleren') {
                if (poll.status === 'cancelled') fail('Deze poll is al geannuleerd.');
                poll.status = 'cancelled'; poll.votes = {}; poll.note = `Geannuleerd door staff (${i.user.id}).`;
            } else {
                if (poll.status !== 'open') fail('Deze poll is al afgelopen of geannuleerd.');
                if (action === 'stoppen') {
                    poll.status = 'closed'; poll.closedAt = Date.now(); poll.note = `Vroegtijdig gestopt door staff (${i.user.id}).`;
                } else if (action === 'wijzigen') {
                    const question = i.options.getString('vraag');
                    const rawAnswers = i.options.getString('antwoorden');
                    const minutes = i.options.getInteger('minuten');
                    if (question === null && rawAnswers === null && minutes === null) fail('Geef een nieuwe vraag, antwoorden of resterende looptijd op.');
                    const nextQuestion = question === null ? poll.question : question.trim();
                    if (!nextQuestion) fail('Vul een geldige vraag in.');
                    const nextOptions = rawAnswers === null ? poll.options : answers(rawAnswers);
                    const reset = nextQuestion !== poll.question || JSON.stringify(nextOptions) !== JSON.stringify(poll.options);
                    poll.question = nextQuestion; poll.options = nextOptions;
                    if (reset) { poll.votes = {}; poll.revision++; }
                    if (minutes !== null) poll.endsAt = Date.now() + minutes * 60000;
                    poll.note = `Gewijzigd door staff (${i.user.id}).${reset ? ' Stemmen gewist; stem opnieuw.' : ' Bestaande stemmen behouden.'}`;
                }
            }
            store.save(poll);
            const warning = await syncStatus(client, poll);
            return i.editReply(`✅ Poll #${id}: ${poll.note}${warning}`);
        });
    });
}
async function vote(client, i) {
    return guarded(i, async () => {
        const match = /^poll:(\d+):(\d+):(\d+)$/.exec(i.customId);
        if (!match) fail('Ongeldige pollknop.');
        const [, rawId, rawRevision, rawIndex] = match;
        const id = Number(rawId), index = Number(rawIndex);
        return locked(id, async () => {
            const poll = store.get(id);
            if (!poll || poll.guildId !== i.guildId || poll.messageId !== i.message.id) fail('Deze poll is niet beschikbaar.');
            expire(poll);
            if (poll.status !== 'open') fail('Deze poll is gesloten. Je kunt niet meer stemmen.');
            if (poll.revision !== Number(rawRevision)) fail('Deze poll is gewijzigd. Gebruik de nieuwe knoppen en stem opnieuw.');
            if (index >= poll.options.length) fail('Dit antwoord bestaat niet.');
            const selected = poll.votes[i.user.id] || [];
            const next = selected.includes(index) ? selected.filter(v => v !== index) : poll.multiple ? [...selected, index] : [index];
            if (next.length) poll.votes[i.user.id] = next;
            else delete poll.votes[i.user.id];
            store.save(poll);
            const warning = await syncStatus(client, poll);
            return i.editReply({ content: (next.length ? `✅ Jouw keuze(s): ${next.map(v => poll.options[v]).join(', ')}` : 'Je stem is ingetrokken.') + warning, allowedMentions: { parse: [] } });
        });
    });
}
async function tick(client) {
    for (const item of store.pending()) {
        await locked(item.id, async () => {
            const poll = store.get(item.id);
            if (poll) await sync(client, expire(poll));
        }).catch(() => {});
    }
}
function start(client) {
    if (timer) return;
    let busy = false;
    const run = async () => {
        if (busy) return;
        busy = true;
        try { await tick(client); } catch (error) { logger.warn(`Polltimer: ${error.message}`); }
        finally { busy = false; }
    };
    timer = setInterval(run, 10000); timer.unref();
    void run();
}
module.exports = { command, vote, start, answers, payload, tick };
