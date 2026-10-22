'use strict';
const fs = require('node:fs');
const path = require('node:path');
function checkVersions(root) {
    const read = name => fs.readFileSync(path.join(root, name), 'utf8');
    const pkg = JSON.parse(read('package.json'));
    const lock = JSON.parse(read('package-lock.json'));
    const errors = [];
    const version = pkg.version;
    if (!/^\d+\.\d+\.\d+$/.test(version)) errors.push('Ongeldige stabiele packageversie.');
    for (const [name, value] of Object.entries({
        'package-lock.json': lock.version,
        'package-lock.json root': lock.packages?.['']?.version,
        'config/defaults.js': require(path.join(root, 'config/defaults.js')).Version
    })) if (value !== version) errors.push(`${name}: ${value}; verwacht ${version}.`);
    const heading = read('README.md').split(/\r?\n/)[0];
    if (!heading.endsWith(`— ${version}`)) errors.push('README-titel heeft een andere versie.');
    const releases = [...read('CHANGELOG.md').matchAll(/^##\s+(\d+\.\d+\.\d+)(?:\s|$)/gm)].map(m => m[1]);
    if (releases[0] !== version || releases.filter(v => v === version).length !== 1) {
        errors.push('Changelog moet beginnen met één hoofdstuk voor de huidige versie.');
    }
    return errors;
}
if (require.main === module) {
    try {
        const errors = checkVersions(path.resolve(__dirname, '..'));
        if (errors.length) throw new Error(errors.join('\n'));
        console.log('Versies in package, lockfile, configuratie, README en changelog zijn gelijk.');
    } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { checkVersions };
