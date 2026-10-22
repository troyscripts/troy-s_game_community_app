'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const tests = fs.readdirSync(__dirname).filter(name => /^test-.*\.(?:cjs|js)$/.test(name)).sort();
if (!tests.length) throw new Error('Geen testbestanden gevonden.');
const failed = [];
for (const name of tests) {
    console.log(`\n=== ${name} ===`);
    const result = spawnSync(process.execPath, [path.join(__dirname, name)], {
        cwd: root, stdio: 'inherit', timeout: 120000
    });
    if (result.error || result.status !== 0) {
        failed.push(name);
        console.error(result.error?.message || `Test gestopt: ${result.signal || result.status}`);
    }
}
console.log(`\n${tests.length - failed.length}/${tests.length} testbestanden geslaagd.`);
if (failed.length) {
    console.error(`Mislukt: ${failed.join(', ')}`);
    process.exitCode = 1;
}
