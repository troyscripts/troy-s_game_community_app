const { db } = require('./database');

db.exec(`CREATE TABLE IF NOT EXISTS ticket_panels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    categories_json TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL
)`);
// Existing panels retain their categories and use all StaffRoles until replaced.
if (!db.prepare('PRAGMA table_info(ticket_panels)').all().some(column => column.name === 'minimum_roles_json')) {
    db.exec("ALTER TABLE ticket_panels ADD COLUMN minimum_roles_json TEXT NOT NULL DEFAULT '[]'");
}
if (!db.prepare('PRAGMA table_info(ticket_panels)').all().some(c => c.name === 'parent_category_id')) {
    db.exec('ALTER TABLE ticket_panels ADD COLUMN parent_category_id TEXT');
}
if (!db.prepare('PRAGMA table_info(ticket_panels)').all().some(c => c.name === 'parent_categories_json')) {
    db.exec("ALTER TABLE ticket_panels ADD COLUMN parent_categories_json TEXT NOT NULL DEFAULT '[]'");
}
const defaults = [
    { value: 'support', label: 'Support' },
    { value: 'sollicitatie', label: 'Sollicitatie' },
    { value: 'bug', label: 'Bug melden' }
];
function normalize(labels) {
    if (!Array.isArray(labels) || labels.length < 1 || labels.length > 10) {
        throw new Error('Gebruik minimaal 1 en maximaal 10 categorieën.');
    }
    const result = labels.map(label => String(label).trim());
    if (result.some(label => !label || label.length > 50 || /[\r\n]/.test(label))) {
        throw new Error('Elke categorienaam moet 1–50 tekens bevatten, op één regel.');
    }
    if (new Set(result.map(label => label.toLocaleLowerCase('nl-NL'))).size !== result.length) {
        throw new Error('Gebruik verschillende namen voor de categorieën.');
    }
    return result;
}
function create(guildId, userId, labels, minimumRoles = [], parentCategoryId = null, parentCategories = []) {
    const normalized = normalize(labels);
    if (!Array.isArray(minimumRoles) || minimumRoles.length > normalized.length ||
        minimumRoles.some(id => id !== null && id !== undefined && !/^\d{17,20}$/.test(id))) {
        throw new Error('Ongeldige minimumrol bij een categorie.');
    }
    if (!Array.isArray(parentCategories) || parentCategories.length > normalized.length || parentCategories.some(id => id != null && !/^\d{17,20}$/.test(id))) throw new Error('Ongeldige Discord-doelcategorie.');
    const result = db.prepare('INSERT INTO ticket_panels (guild_id,categories_json,created_by,created_at,minimum_roles_json,parent_category_id,parent_categories_json) VALUES (?,?,?,?,?,?,?)')
        .run(guildId, JSON.stringify(normalized), userId, Date.now(), JSON.stringify(normalized.map((_,index) => minimumRoles[index] || null)), parentCategoryId, JSON.stringify(normalized.map((_, i) => parentCategories[i] || null)));
    return String(result.lastInsertRowid);
}
function getOptions(guildId, panelId) {
    if (!panelId) return defaults.map(option => ({ ...option }));
    if (!/^[1-9]\d*$/.test(panelId)) throw new Error('Dit ticketpaneel is niet geldig.');
    const row = db.prepare('SELECT categories_json FROM ticket_panels WHERE guild_id=? AND id=?').get(guildId, panelId);
    if (!row) throw new Error('Dit ticketpaneel is niet meer beschikbaar. Vraag een beheerder om een nieuw paneel.');
    return normalize(JSON.parse(row.categories_json)).map((label,index) => ({ value: String(index), label }));
}
function resolve(guildId, panelId, value) {
    // Existing legacy forms with the earlier custom "game" category remain valid.
    if (!panelId && value === 'game') return 'Game';
    const option = getOptions(guildId, panelId).find(option => option.value === value);
    if (!option) throw new Error('Deze categorie hoort niet bij dit ticketpaneel. Open het paneel opnieuw.');
    return option.label;
}
function getMinimumRole(guildId, panelId, value) {
    resolve(guildId, panelId, value);
    if (!panelId) return null;
    const row = db.prepare('SELECT minimum_roles_json FROM ticket_panels WHERE guild_id=? AND id=?').get(guildId, panelId);
    return JSON.parse(row.minimum_roles_json)[Number(value)] || null;
}
function remove(guildId, panelId) {
    db.prepare('DELETE FROM ticket_panels WHERE guild_id=? AND id=?').run(guildId, panelId);
}
function getParentCategory(guildId, panelId, value) {
    if (!panelId) return null;
    getOptions(guildId, panelId);
    if (value !== undefined) resolve(guildId, panelId, value);
    const row = db.prepare("SELECT parent_category_id,parent_categories_json FROM ticket_panels WHERE guild_id=? AND id=?").get(guildId, panelId);
    return (value !== undefined ? JSON.parse(row.parent_categories_json)[Number(value)] : null) || row.parent_category_id;
}
module.exports = { getParentCategory, normalize, create, getOptions, resolve, getMinimumRole, remove };
