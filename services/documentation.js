const fs = require('node:fs/promises');
const { constants } = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const ROOT = path.resolve(__dirname, '../docs');
const EXTENSIONS = new Set(['.md', '.txt', '.pdf', '.docx']);
const identifier = name => name.length <= 100 ? name : `doc-${createHash('sha256').update(name).digest('hex')}`;
async function catalog(root = ROOT) {
    const documents = [];
    async function walk(relative = '') {
        let entries;
        try { entries = await fs.readdir(path.join(root, relative), { withFileTypes: true }); }
        catch (error) { if (error.code === 'ENOENT') return; throw error; }
        for (const entry of entries) {
            if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
            const name = relative ? `${relative}/${entry.name}` : entry.name;
            if (entry.isDirectory()) await walk(name);
            else if (entry.isFile() && EXTENSIONS.has(path.extname(name).toLowerCase())) documents.push({ name, value: identifier(name) });
        }
    }
    await walk();
    return documents.sort((a, b) => a.name.localeCompare(b.name));
}
async function readDocument(selection, root = ROOT) {
    const entry = (await catalog(root)).find(d => d.value === selection || d.name === selection);
    if (!entry) throw new Error('DOCUMENT_NOT_FOUND');
    const resolvedRoot = await fs.realpath(root);
    const filename = await fs.realpath(path.join(root, entry.name));
    if (!filename.startsWith(resolvedRoot + path.sep)) throw new Error('DOCUMENT_NOT_FOUND');
    const file = await fs.open(filename, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
        const stat = await file.stat();
        if (!stat.isFile() || stat.size > 8 * 1024 * 1024) throw new Error('DOCUMENT_TOO_LARGE');
        return { name: path.basename(entry.name), attachment: await file.readFile() };
    } finally { await file.close(); }
}
module.exports = { catalog, readDocument, ROOT };
