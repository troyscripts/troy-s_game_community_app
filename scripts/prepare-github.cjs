'use strict';
// Alleen gecontroleerde projectbestanden kopiëren; geen botmodules laden of bot starten.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const destination = path.join(root, `github-export-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const folders = ['buttons','commands','config','database','events','handlers','modals','scripts','selectmenus','services','utils'];
const roots = ['.env.example','.gitignore','package.json','package-lock.json','index.js','deploy-commands.js',
    'herstel-serverconfig.cjs','README.md','CHANGELOG.md','GITHUB-INSTALLATIE.md','UPGRADE-2.4.6.md','INSTALLATIE-CHANGELOG.md'];
const files = [...roots];
function walk(folder) {
    for (const entry of fs.readdirSync(path.join(root, folder), {withFileTypes:true})) {
        if (['node_modules','backups','logs','transcripts','.git'].includes(entry.name)) continue;
        const relative = path.join(folder, entry.name);
        if (entry.isSymbolicLink()) throw new Error(`Symbolische link niet toegestaan: ${relative}`);
        if (entry.isDirectory()) walk(relative);
        else if (/\.(?:js|cjs)$/.test(entry.name)) files.push(relative);
    }
}
for (const folder of folders) walk(folder);
// Blokkeer herkenbare concrete IDs/tokens. Dit is een extra controle, geen garantie
// dat willekeurige vrije tekst nooit persoonsgegevens kan bevatten.
for (const file of files) {
    const full = path.join(root, file);
    if (fs.lstatSync(full).isSymbolicLink()) throw new Error(`Symbolische link niet toegestaan: ${file}`);
    const text = fs.readFileSync(full, 'utf8');
    const ids = [...text.matchAll(/\b\d{17,20}\b/g)].map(m => m[0]);
    const realIds = ids.filter(id => !(file === path.join('scripts','test-ticket-upgrade.cjs') && /^([1-4])\1{17}$/.test(id)));
    if (realIds.length || /(?:mfa\.[\w-]{60,}|[\w-]{23,28}\.[\w-]{6}\.[\w-]{27,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|discord(?:app)?\.com\/api\/webhooks\/\d+\/|-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----)/.test(text)) {
        throw new Error(`Mogelijk privé-ID of geheim in ${file}. Verwijder dit uit de openbare broncode en probeer opnieuw.`);
    }
    if (file === '.env.example') {
        const safeDefaults = new Set(['MESSAGE_CONTENT_INTENT=true','OLLAMA_BASE_URL=http://127.0.0.1:11434','OLLAMA_MODEL=qwen3:4b','UPDATE_CHECK_ENABLED=true']);
        for (const line of text.split(/\r?\n/).map(line => line.trim())) {
            if (!line || line.startsWith('#') || /^[A-Z_]+=$/.test(line) || safeDefaults.has(line)) continue;
            throw new Error('.env.example bevat ingevulde waarden; houd eigen instellingen uitsluitend in .env.');
        }
    }
}
fs.mkdirSync(destination);
for (const file of files) {
    const target = path.join(destination,file);
    fs.mkdirSync(path.dirname(target), {recursive:true});
    fs.copyFileSync(path.join(root,file),target);
}
console.log(`GitHub-map aangemaakt: ${destination}\n${files.length} bronbestanden. Upload alleen de inhoud van deze map.\nLoop de inhoud na; dit is geen volledige secretscanner. De oorspronkelijke botdata is behouden.`);
