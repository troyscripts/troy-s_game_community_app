const config = require('../config/config');
const logger = require('../utils/logger');
const birthdays = require('../database/birthday');
const taskState = require('../database/taskState');

let timer = null;
let running = false;
const snapshots = new Map();

function zonedNow(birthdayConfig) {
    return Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
        timeZone: birthdayConfig.Timezone || 'Europe/Amsterdam',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date()).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
}

async function checkGuild(guild) {
    const settings = config.Birthday;
    if (!settings?.Enabled) return;
    const now = zonedNow(settings);
    const today = `${now.year}-${now.month}-${now.day}`;
    const records = birthdays.getBirthdaysForDay(guild.id, `${now.day}-${now.month}`);
    const ids = new Set(records.map(r => r.user_id));
    const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(settings.CheckTime || '') ? settings.CheckTime : '00:00';
    const [hour, minute] = time.split(':').map(Number);
    const due = Number(now.hour) * 60 + Number(now.minute) >= hour * 60 + minute;

    // Independent of announcement state: stale roles must also be removed after a restart.
    let members = guild.members.cache;
    let role = null;
    let roleReady = false;
    if (settings.Role) {
        try {
            role = await guild.roles.fetch(settings.Role);
            if (!role) throw new Error('Ingestelde verjaardagsrol bestaat niet.');
            const previous = snapshots.get(guild.id);
            // A full fetch is necessary after restart and day rollover, including offline members.
            // Refresh periodically for missed member updates; do not fetch every minute.
            if (!previous || previous.day !== today || previous.role !== role.id || Date.now() - previous.at >= 15 * 60000) {
                members = await guild.members.fetch();
                snapshots.set(guild.id, {day: today, role: role.id, at: Date.now()});
            }
            roleReady = true;
            for (const member of members.values()) {
                if (member.roles.cache.has(role.id) && !ids.has(member.id)) {
                    try {
                        await member.roles.remove(role.id, 'Verjaardagsdag afgelopen');
                    } catch (error) {
                        logger.warn(`Verjaardagsrol verwijderen mislukt [server ${guild.id}, lid ${member.id}]: ${error.message}. Controleer Rollen beheren en rolvolgorde; volgende minuut opnieuw.`);
                    }
                }
            }
        } catch (error) {
            logger.warn(`Verjaardagsrollen controleren mislukt [server ${guild.id}]: ${error.message}. Controleer Server Members Intent en de ingestelde rol.`);
        }
    }
    if (!due) return;

    const alreadyAnnounced = taskState.getLastRun('birthdays', guild.id) === today;
    let allMessagesDone = true;
    let channel = null;
    if (!alreadyAnnounced && records.length && settings.Channel) {
        try { channel = await guild.channels.fetch(settings.Channel); }
        catch (error) { logger.warn(`Verjaardagskanaal ophalen mislukt [${guild.id}]: ${error.message}`); }
    }
    const messages = settings.Messages?.length ? settings.Messages : ['Van harte gefeliciteerd, {user}! 🎉'];
    for (const record of records) {
        let member;
        try {
            member = members.get(record.user_id) || await guild.members.fetch(record.user_id);
        } catch (error) {
            // A departed member is not a delivery failure. Other errors need a retry.
            if (Number(error.code) !== 10007) {
                allMessagesDone = false;
                logger.warn(`Jarige ophalen mislukt [${guild.id}, ${record.user_id}]: ${error.message}`);
            }
            continue;
        }
        if (!member) continue;
        if (roleReady && !member.roles.cache.has(role.id)) {
            try { await member.roles.add(role.id, 'Vandaag jarig'); }
            catch (error) { logger.warn(`Verjaardagsrol geven mislukt [${guild.id}, ${member.id}]: ${error.message}. Volgende minuut opnieuw.`); }
        }
        // Preserve the legacy daily marker, and remember individual successes on partial failures.
        const deliveryKey = `birthday-message:${member.id}`;
        if (alreadyAnnounced || taskState.getLastRun(deliveryKey, guild.id) === today) continue;
        if (!settings.Channel) continue;
        if (!channel?.isTextBased?.() || typeof channel.send !== 'function') {
            allMessagesDone = false;
            logger.warn(`Verjaardagsbericht niet verstuurd [${guild.id}]: controleer Birthday.Channel en kanaaltoegang.`);
            continue;
        }
        try {
            const text = String(messages[Math.floor(Math.random() * messages.length)]).replaceAll('{user}', `<@${member.id}>`);
            await channel.send({content: text, allowedMentions: {parse: [], users: [member.id]}});
            taskState.setLastRun(deliveryKey, guild.id, today);
        } catch (error) {
            allMessagesDone = false;
            logger.warn(`Verjaardagsbericht sturen mislukt [${guild.id}, ${member.id}]: ${error.message}`);
        }
    }
    if (!alreadyAnnounced && allMessagesDone) taskState.setLastRun('birthdays', guild.id, today);
}

async function runBirthdayCheck(client) {
    if (running) return;
    running = true;
    try {
        for (const guild of client.guilds.cache.values()) {
            try { await config.__context.run(guild.id, () => checkGuild(guild)); }
            catch (error) { logger.error(`Verjaardagscontrole mislukt [${guild.id}]: ${error.message}`); }
        }
    } finally { running = false; }
}
function startBirthdayScheduler(client) {
    if (timer) return;
    const tick = () => runBirthdayCheck(client).catch(error => logger.error(`Verjaardagscontrole mislukt: ${error.message}`));
    tick();
    timer = setInterval(tick, 60000);
    timer.unref();
}
function stopBirthdayScheduler() {
    if (timer) clearInterval(timer);
    timer = null;
    snapshots.clear();
}
module.exports = {startBirthdayScheduler, stopBirthdayScheduler, runBirthdayCheck};
