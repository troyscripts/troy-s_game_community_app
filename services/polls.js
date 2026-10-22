const { tr, send, pair } = require("../utils/localization");
const { MessageFlags } = require('discord.js');
const store = require('../database/polls');
const { translate } = require('./pollTranslation');
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
        fail(tr("Geef 2 tot 10 antwoorden, gescheiden door |. Elk antwoord moet 1 tot 80 tekens bevatten."));
    }
    if (new Set(values.map(value => value.toLocaleLowerCase('nl'))).size !== values.length) fail(tr("Elk antwoord moet verschillend zijn."));
    return values;
}
function expire(poll) {
    if (poll.status === 'open' && poll.endsAt <= Date.now()) {
        poll.status = 'closed'; poll.closedAt = Date.now(); poll.note = tr("Automatisch afgelopen.");
        store.save(poll);
    }
    return poll;
}
function payload(poll) {
    const cancelled = poll.status === 'cancelled';
    const counts = poll.options.map((_, index) => Object.values(poll.votes).filter(v => v.includes(index)).length);
    const voters = Object.keys(poll.votes).length;
    const status = { open: 'Open', closed: tr("Afgelopen"), cancelled: tr("Geannuleerd") }[poll.status];
    const lines = poll.options.map((option, index) => `${index + 1}. ${pair(option, poll.optionsEn?.[index] || option)}${cancelled ? '' : tr(" — **{0}** stem(men)", counts[index])}`);
    const end = Math.floor(poll.endsAt / 1000);
    const description = [pair(poll.question, poll.questionEn || poll.question), '',
        poll.status === 'open' ? tr("Sluit <t:{0}:R> · <t:{1}:f>", end, end) : cancelled ? tr("Deze poll is ongeldig. De stemmen zijn gewist.") : tr("Stemmen is gesloten."),
        poll.multiple ? tr("Meerdere antwoorden mogelijk. Klik opnieuw om je keuze te verwijderen.") : tr("Eén antwoord per persoon. Klik een ander antwoord om te wisselen; klik opnieuw om je stem in te trekken."),
        tr("Deelnemers: **{0}**", voters), poll.note || ''].join('\n');
    const components = [];
    if (poll.status === 'open') {
        for (let start = 0; start < poll.options.length; start += 5) {
            components.push({ type: 1, components: poll.options.slice(start, start + 5).map((_, offset) => ({
                type: 2, style: 1, label: tr("Antwoord {0}", start + offset + 1),
                custom_id: `poll:${poll.id}:${poll.revision}:${start + offset}`
            })) });
        }
    }
    return { embeds: [{ fields: lines.map((line,index) => ({name: `${index+1}.`, value: line.replace(/^\d+\. /, '')})), title: `📊 Poll #${poll.id} · ${status}`, description,
        color: cancelled ? 0xED4245 : poll.status === 'open' ? 0x5865F2 : 0x57F287,
        footer: { text: tr("Poll-ID: {0} • Gemaakt door {1}", poll.id, poll.createdBy) } }],
        components, allowedMentions: { parse: [] } };
}
async function sync(client, poll) {
    if (!poll.messageId) return;
    try {
        const channel = await client.channels.fetch(poll.channelId);
        if (!channel?.messages) throw new Error(tr("Pollkanaal is niet beschikbaar."));
        const message = await channel.messages.fetch(poll.messageId);
        await send(message, "edit", payload(poll));
        store.save(poll, false);
    } catch (error) {
        if ([10003, 10008].includes(Number(error.code))) {
            poll.status = 'cancelled'; poll.votes = {}; poll.note = tr("Pollbericht of kanaal verwijderd.");
            store.save(poll, false);
        } else {
            logger.warn(`Poll #${poll.id} kon niet bijgewerkt worden: ${error.message}. Nieuwe poging volgt.`);
            throw error;
        }
    }
}
async function syncStatus(client, poll) {
    try { await sync(client, poll); return ''; }
    catch { return tr("\nDe wijziging is opgeslagen, maar het pollbericht kon nog niet worden bijgewerkt. De bot probeert het opnieuw; controleer de kanaalrechten."); }
}
async function guarded(interaction, action) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try { return await action(); }
    catch (error) {
        if (!error.pollInput) throw error;
        return send(interaction, "editReply", { content: error.message, allowedMentions: { parse: [] } });
    }
}
async function command(client, i) {
    return guarded(i, async () => {
        const action = i.options.getSubcommand();
        if (action !== 'maken' && !(hasStaffRole(i.member) || hasOwnerAccess(i.member, i.user.id) || isDeveloper(i.user.id))) {
            fail(tr("Alleen staff, de servereigenaar en botbeheerders mogen polls beheren."));
        }
        if (action === 'maken') {
            const question = i.options.getString('vraag').trim();
            if (!question) fail(tr("Vul een vraag in."));
            const options = answers(i.options.getString('antwoorden'));
            const translation = await translate(question, options, {questionEn:i.options.getString('vraag-en'),answersEn:i.options.getString('antwoorden-en')});
            const poll = store.create({ guildId: i.guildId, channelId: i.channelId, messageId: null,
                question, options, ...translation, multiple: i.options.getBoolean('meerdere') || false,
                endsAt: Date.now() + i.options.getInteger('minuten') * 60000,
                createdBy: i.user.id, status: 'open', votes: {}, revision: 1, note: '' });
            let message;
            try { message = await send(i.channel, "send", payload(poll)); }
            catch (error) { store.remove(poll.id); throw error; }
            poll.messageId = message.id;
            store.save(poll, false);
            return send(i, "editReply", tr("✅ Poll #{0} aangemaakt: {1}", poll.id, message.url));
        }
        const id = i.options.getInteger('id');
        return locked(id, async () => {
            const poll = store.get(id);
            if (!poll || poll.guildId !== i.guildId) fail(tr("Deze poll bestaat niet in deze server. Gebruik het Poll-ID onder het bericht."));
            expire(poll);
            if (action === 'annuleren') {
                if (poll.status === 'cancelled') fail(tr("Deze poll is al geannuleerd."));
                poll.status = 'cancelled'; poll.votes = {}; poll.note = tr("Geannuleerd door staff ({0}).", i.user.id);
            } else {
                if (poll.status !== 'open') fail(tr("Deze poll is al afgelopen of geannuleerd."));
                if (action === 'stoppen') {
                    poll.status = 'closed'; poll.closedAt = Date.now(); poll.note = tr("Vroegtijdig gestopt door staff ({0}).", i.user.id);
                } else if (action === 'wijzigen') {
                    const question = i.options.getString('vraag');
                    const rawAnswers = i.options.getString('antwoorden');
                    const minutes = i.options.getInteger('minuten');
                    const questionEn = i.options.getString('vraag-en'), answersEn = i.options.getString('antwoorden-en');
                    if (question === null && rawAnswers === null && minutes === null && questionEn === null && answersEn === null) fail(tr("Geef een nieuwe vraag, antwoorden of resterende looptijd op."));
                    const nextQuestion = question === null ? poll.question : question.trim();
                    if (!nextQuestion) fail(tr("Vul een geldige vraag in."));
                    const nextOptions = rawAnswers === null ? poll.options : answers(rawAnswers);
                    const reset = nextQuestion !== poll.question || JSON.stringify(nextOptions) !== JSON.stringify(poll.options);
                    const translationChanged = questionEn !== null || answersEn !== null;
                    const translation = (reset || translationChanged || !poll.questionEn) ? await translate(nextQuestion, nextOptions, {questionEn,answersEn}) : null;
                    // Recheck the deadline after an external translation request.
                    expire(poll);
                    if (poll.status !== 'open') fail(tr('Deze poll is al afgelopen of geannuleerd.'));
                    poll.question = nextQuestion; poll.options = nextOptions;
                    if (translation) Object.assign(poll, translation);
                    if (reset || translationChanged) { poll.votes = {}; poll.revision++; }
                    if (minutes !== null) poll.endsAt = Date.now() + minutes * 60000;
                    poll.note = tr("Gewijzigd door staff ({0}).{1}", i.user.id, reset || translationChanged ? tr(" Stemmen gewist; stem opnieuw.") : tr(" Bestaande stemmen behouden."));
                }
            }
            store.save(poll);
            const warning = await syncStatus(client, poll);
            return send(i, "editReply", `✅ Poll #${id}: ${poll.note}${warning}`);
        });
    });
}
async function vote(client, i) {
    return guarded(i, async () => {
        const match = /^poll:(\d+):(\d+):(\d+)$/.exec(i.customId);
        if (!match) fail(tr("Ongeldige pollknop."));
        const [, rawId, rawRevision, rawIndex] = match;
        const id = Number(rawId), index = Number(rawIndex);
        return locked(id, async () => {
            const poll = store.get(id);
            if (!poll || poll.guildId !== i.guildId || poll.messageId !== i.message.id) fail(tr("Deze poll is niet beschikbaar."));
            expire(poll);
            if (poll.status !== 'open') fail(tr("Deze poll is gesloten. Je kunt niet meer stemmen."));
            if (poll.revision !== Number(rawRevision)) fail(tr("Deze poll is gewijzigd. Gebruik de nieuwe knoppen en stem opnieuw."));
            if (index >= poll.options.length) fail(tr("Dit antwoord bestaat niet."));
            const selected = poll.votes[i.user.id] || [];
            const next = selected.includes(index) ? selected.filter(v => v !== index) : poll.multiple ? [...selected, index] : [index];
            if (next.length) poll.votes[i.user.id] = next;
            else delete poll.votes[i.user.id];
            store.save(poll);
            const warning = await syncStatus(client, poll);
            return send(i, "editReply", { content: (next.length ? tr("✅ Jouw keuze(s): {0}", next.map(v => pair(poll.options[v], poll.optionsEn?.[v] || poll.options[v])).join(', ')) : tr("Je stem is ingetrokken.")) + warning, allowedMentions: { parse: [] } });
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
