// Uitvoeren vanuit de botmap met: node herstel-serverconfig.cjs
const fs = require('node:fs');
const path = require('node:path');
const GUILD_ID = process.argv[2];

function removeTrailingCommas(text) {
    let result = '', inString = false, escaped = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inString) {
            result += c;
            if (escaped) escaped = false;
            else if (c === '\\') escaped = true;
            else if (c === '"') inString = false;
        } else {
            if (c === '"') inString = true;
            if (c === ',') {
                let j = i + 1;
                while (/\s/.test(text[j] || '') && j < text.length) j++;
                if (text[j] === ']' || text[j] === '}') continue;
            }
            result += c;
        }
    }
    return result;
}

async function main() {
    if (!/^\d{17,20}$/.test(GUILD_ID || "")) throw new Error("Gebruik: node herstel-serverconfig.cjs JOUW_SERVER_ID");
    const defaults = require(path.join(__dirname, 'config/defaults.js'));
    const Database = require('better-sqlite3');
    const filename = path.resolve(__dirname, defaults.Database.File);
    const db = new Database(filename, {fileMustExist: true});
    try {
        const row = db.prepare('SELECT config_json FROM settings WHERE guild_id = ?').get(GUILD_ID);
        if (!row || typeof row.config_json !== 'string') throw new Error('Geen opgeslagen configuratie voor deze server gevonden.');
        try {
            JSON.parse(row.config_json);
            console.log('De configuratie is al geldige JSON. Niets gewijzigd.');
            return;
        } catch { /* Controleer of uitsluitend overtollige komma’s de oorzaak zijn. */ }
        const repaired = removeTrailingCommas(row.config_json);
        const parsed = JSON.parse(repaired);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('De configuratie moet een JSON-object zijn.');
        if (repaired === row.config_json) throw new Error('Geen herstelbare overtollige komma gevonden.');
        const folder = path.join(path.dirname(filename), 'backups');
        fs.mkdirSync(folder, {recursive:true});
        const backup = path.join(folder, `voor-configherstel-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`);
        await db.backup(backup);
        console.log('Back-up gemaakt:', backup);
        db.transaction(() => {
            const result = db.prepare('UPDATE settings SET config_json = ? WHERE guild_id = ? AND config_json = ?').run(repaired, GUILD_ID, row.config_json);
            if (result.changes !== 1) throw new Error('De instellingen zijn ondertussen gewijzigd. Opnieuw uitvoeren met de bot gestopt.');
        })();
        console.log(`Configuratie van server ${GUILD_ID} hersteld. Start de bot met npm start.`);
    } finally {
        db.close();
    }
}

module.exports = {removeTrailingCommas};
if (require.main === module) main().catch(error => {
    console.error('Herstel gestopt:', error.message);
    process.exitCode = 1;
});
