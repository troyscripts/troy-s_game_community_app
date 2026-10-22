'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { checkVersions } = require('./check-versions.cjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'troy-versions-'));
const write = (name, text) => fs.writeFileSync(path.join(tmp, name), text);
try {
    fs.mkdirSync(path.join(tmp, 'config'));
    write('package.json', JSON.stringify({ version: '1.2.3' }));
    write('package-lock.json', JSON.stringify({ version: '1.2.3', packages: { '': { version: '1.2.3' } } }));
    write('config/defaults.js', 'module.exports = { Version: "1.2.3" };');
    write('README.md', '# Bot — 1.2.3\n');
    write('CHANGELOG.md', '## 1.2.3 — Release\n\n- Test.\n');
    assert.deepEqual(checkVersions(tmp), []);
    write('package-lock.json', JSON.stringify({ version: '1.2.2', packages: { '': { version: '1.2.1' } } }));
    assert.equal(checkVersions(tmp).length, 2);
    write('README.md', '# Bot — 1.2.2\n');
    write('CHANGELOG.md', '## 1.2.2 — Release\n');
    assert.equal(checkVersions(tmp).length, 4);
    console.log('PASS: consistente release geaccepteerd; oude lockfile, README en ontbrekende changelog afgewezen.');
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
