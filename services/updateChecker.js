'use strict';
const settings = require('../config/updates');
const currentVersion = require('../package.json').version;
let timer = null;
let running = false;
let lastMessage = '';

function repository(value) {
    const text = String(value || '').trim().replace(/\.git\/?$/, '').replace(/\/$/, '');
    const match = text.match(/^(?:https:\/\/github\.com\/)?([A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)\/([A-Za-z0-9_.-]+)$/);
    if (!match || ['.', '..'].includes(match[2])) throw new Error('Vul een geldige openbare GitHub-repository in config/updates.js in.');
    return `${match[1]}/${match[2]}`;
}
function parseVersion(value) {
    const match = String(value).match(/^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([\w.-]+))?(?:\+[\w.-]+)?$/);
    if (!match) throw new Error('Ongeldige versie; gebruik een release-tag zoals v2.4.7.');
    return { parts: match.slice(1, 4).map(BigInt), prerelease: match[4] || '' };
}
function isNewerStable(remote, local) {
    const a = parseVersion(remote), b = parseVersion(local);
    if (a.prerelease) return false;
    for (let i = 0; i < 3; i++) {
        if (a.parts[i] !== b.parts[i]) return a.parts[i] > b.parts[i];
    }
    return Boolean(b.prerelease);
}
async function checkForUpdate({ repo, version = currentVersion, fetchImpl = globalThis.fetch } = {}) {
    const slug = repository(repo);
    const response = await fetchImpl(`https://api.github.com/repos/${slug}/releases/latest`, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Community-Bot-Update-Checker' },
        redirect: 'error', signal: AbortSignal.timeout(10000)
    });
    if (response.status === 404) return { status: 'missing', slug };
    if (response.status === 403 || response.status === 429) return { status: 'limited', slug };
    if (!response.ok) throw new Error(`GitHub antwoordde met HTTP ${response.status}.`);
    const release = await response.json();
    if (!release || typeof release.tag_name !== 'string') throw new Error('GitHub gaf geen geldige release terug.');
    if (release.draft || release.prerelease) return { status: 'ignored', slug };
    const newer = isNewerStable(release.tag_name, version);
    return { status: newer ? 'update' : 'current', version: release.tag_name,
        url: `https://github.com/${slug}/releases/tag/${encodeURIComponent(release.tag_name)}` };
}
function startUpdateChecker() {
    if (timer || running) return;
    const logger = require('../utils/logger');
    if (!settings.Enabled || process.env.UPDATE_CHECK_ENABLED === 'false') return;
    const repo = process.env.GITHUB_REPOSITORY?.trim() || settings.Repository;
    if (!repo) {
        logger.info('Versiechecker: vul Repository in config/updates.js in om GitHub-updates te controleren.');
        return;
    }
    try { repository(repo); } catch (error) { logger.warn(error.message); return; }
    const tick = async () => {
        if (running) return;
        running = true;
        try {
            const result = await checkForUpdate({ repo });
            const messages = {
                missing: 'Versiechecker: geen openbare Latest-release gevonden; controleer repository en publiceer een release.',
                limited: 'Versiechecker: GitHub beperkt de aanvragen. De volgende controle probeert opnieuw.',
                ignored: 'Versiechecker: concept- of testrelease overgeslagen.',
                current: `Versiechecker: ${currentVersion} is gelijk aan of nieuwer dan de laatste stabiele release.`,
                update: `Nieuwe botversie ${result.version} beschikbaar (geïnstalleerd: ${currentVersion}). Download: ${result.url}`
            };
            const message = messages[result.status];
            if (message !== lastMessage) {
                (result.status === 'update' ? logger.warn : logger.info)(message);
                lastMessage = message;
            }
        } catch {
            const message = 'Versiechecker: controle mislukt (verbinding of ongeldige release). De bot blijft werken; volgende controle probeert opnieuw.';
            if (lastMessage !== message) { logger.warn(message); lastMessage = message; }
        } finally { running = false; }
    };
    const hours = Math.min(168, Math.max(1, Number(settings.IntervalHours) || 6));
    timer = setInterval(tick, hours * 3600000);
    timer.unref();
    void tick();
}
function stopUpdateChecker() {
    if (timer) clearInterval(timer);
    timer = null;
    lastMessage = '';
}
module.exports = { repository, isNewerStable, checkForUpdate, startUpdateChecker, stopUpdateChecker };
