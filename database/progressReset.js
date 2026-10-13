const { tr } = require("../utils/localization");
const { db } = require('./database');
// Zorg dat ook de aanvullende economy-tabellen bestaan.
require('./economyActions');

// Eén transactie: een fout draait alle wijzigingen terug.
const resetProgress = db.transaction((guildId) => {
    if (typeof guildId !== 'string' || !guildId.trim()) {
        throw new Error(tr("Een Discord-server is verplicht."));
    }
    const levels = db.prepare(`
        UPDATE levels SET xp = 0, level = 1, messages = 0, last_xp = 0
        WHERE guild_id = ?
    `).run(guildId).changes;
    // Rijen behouden voorkomt dat bestaande gebruikers opnieuw startgeld krijgen.
    const economy = db.prepare(`
        UPDATE economy SET wallet = 0, bank = MIN(bank, 0), last_daily = 0, last_work = 0
        WHERE guild_id = ?
    `).run(guildId).changes;
    db.prepare('DELETE FROM economy_actions WHERE guild_id = ?').run(guildId);
    // Gewone rekeningen annuleren; gekochte verplichte rekeningen blijven doorlopen.
    const invoices = db.prepare(`
        UPDATE economy_invoices SET status = 'cancelled', closed_at = ?, payment_source = NULL
        WHERE guild_id = ? AND status = 'open' AND forced = 0
    `).run(Date.now(), guildId).changes;
    return { levels, economy, invoices };
});

module.exports = { resetProgress };
