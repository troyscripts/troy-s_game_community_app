'use strict';
// Exercise startup data and command builders without logging into Discord.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'troy-startup-'));
const defaults = require('../config/defaults');
defaults.Database.File = path.join(tmp, 'test.sqlite');
defaults.Logging.Enabled = false;
let manager;
try {
    manager = require('../database/manager');
    assert.equal(manager.initialize(), true);
    assert.equal(manager.integrityCheck(), 'ok');
    const names = new Set();
    const localization = require('../utils/localization');
    function visit(directory) {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const filename = path.join(directory, entry.name);
            if (entry.isDirectory()) visit(filename);
            else if (entry.name.endsWith('.js')) {
                const command = require(filename);
                assert.equal(typeof command.execute, 'function', filename);
                const data = localization.commandData(command.data.toJSON());
                assert.ok(data.name && data.description, filename);
                assert.ok(!names.has(data.name), `Dubbel command: ${data.name}`);
                names.add(data.name);
            }
        }
    }
    visit(path.resolve(__dirname, '../commands'));
    assert.ok(names.size > 0);
    console.log(`PASS: tijdelijke database geïnitialiseerd; ${names.size} geldige, unieke slashcommands geladen zonder Discord-login.`);
} finally {
    manager?.close();
    fs.rmSync(tmp, { recursive: true, force: true });
}
