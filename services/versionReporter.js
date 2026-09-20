const fs = require('node:fs');
const path = require('node:path');
const config = require('../config/config');
const logger = require('../utils/logger');
const taskState = require('../database/taskState');
const packageInfo = require('../package.json');

const STATE_KEY = 'changelog:last-delivered-version';
let timer = null;
let running = false;

function releaseNotes(markdown, version) {
    const lines = markdown.split(/\r?\n/);
    const start = lines.findIndex(line => {
        const match = line.match(/^##\s+\[?v?(\d+\.\d+\.\d+(?:[-+][\w.-]+)?)\]?(?=\s|$)/);
        return match?.[1] === version;
    });
    if (start < 0) return null;
    let end = start + 1;
    while (end < lines.length && !/^##\s/.test(lines[end])) end++;
    return lines.slice(start + 1, end).join('\n').trim() || null;
}

async function checkVersions(client) {
    if (running || !client.isReady()) return;
    running = true;
    try {
        // Uses the same global version as the existing startup banner.
        const version = String(config.Version || packageInfo.version).trim();
        if (!/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(version)) {
            logger.warn('Changelog: ongeldig botversienummer; controleer config/defaults.js.');
            return;
        }
        let markdown;
        for (const guild of client.guilds.cache.values()) {
            try {
                await config.__context.run(guild.id, async () => {
                    if (!config.Logging?.Enabled || !config.Logging.Channel) return;
                    const previous = taskState.getLastRun(STATE_KEY, guild.id);
                    if (previous === version) return;
                    if (markdown === undefined) markdown = fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8');
                    const notes = releaseNotes(markdown, version);
                    if (!notes) {
                        logger.warn(`Changelog ${version}: versiehoofdstuk ontbreekt; nog niet als verstuurd opgeslagen.`);
                        return;
                    }
                    const channel = await guild.channels.fetch(config.Logging.Channel);
                    if (!channel || channel.guild?.id !== guild.id || !channel.isTextBased?.() || typeof channel.send !== 'function') {
                        throw new Error('Logging.Channel is geen bereikbaar tekstkanaal van deze server.');
                    }
                    const description = notes.length > 3500
                        ? notes.slice(0, 3440) + '\n\nVolledige wijzigingen staan in de bijlage.'
                        : notes;
                    await channel.send({
                        embeds: [{
                            title: `🆕 Bot bijgewerkt naar ${version}`,
                            description,
                            color: 0x57F287,
                            footer: {text: previous ? `Vorige gemelde versie: ${previous}` : 'Eerste automatische versiemelding'},
                            timestamp: new Date().toISOString()
                        }],
                        files: [{attachment: Buffer.from(markdown, 'utf8'), name: 'CHANGELOG.md'}],
                        allowedMentions: {parse: []}
                    });
                    // Only mark delivered AFTER Discord confirmed the message and attachment.
                    taskState.setLastRun(STATE_KEY, guild.id, version);
                    logger.startup(`Changelog ${version} verstuurd in server ${guild.id}.`);
                });
            } catch (error) {
                logger.warn(`Changelog versturen mislukt [server ${guild.id}]: ${error.message}. Nieuwe poging over vijf minuten of bij herstart.`);
            }
        }
    } finally { running = false; }
}
function startVersionReporter(client) {
    if (timer) return;
    const tick = () => checkVersions(client).catch(error => logger.warn(`Changelogcontrole mislukt: ${error.message}`));
    tick();
    timer = setInterval(tick, 5 * 60 * 1000);
    timer.unref();
}
function stopVersionReporter() {
    if (timer) clearInterval(timer);
    timer = null;
}
module.exports = {startVersionReporter, stopVersionReporter, checkVersions, releaseNotes};
