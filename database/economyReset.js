'use strict';
const { db } = require('./database');
require('./economyActions');
const store = require('./store');

// Store rows and XP are deliberately outside this transaction's mutations.
const resetEconomy = db.transaction(guildId => {
    if (typeof guildId !== 'string' || !guildId.trim()) throw new Error('A server ID is required.');
    store.history(guildId, ''); // Initialize optional store tables before checking pending delivery.
    const pending = db.prepare("SELECT COUNT(*) AS n FROM store_orders WHERE guild_id = ? AND status = 'pending'").get(guildId).n;
    // A refund after resetting balances would otherwise restore pre-reset money.
    if (pending) return { pending };
    const economy = db.prepare(`UPDATE economy SET wallet = 0, bank = MIN(bank, 0), last_daily = 0, last_work = 0
        WHERE guild_id = ?`).run(guildId).changes;
    db.prepare('DELETE FROM economy_actions WHERE guild_id = ?').run(guildId);
    const invoices = db.prepare(`UPDATE economy_invoices SET status = 'cancelled', closed_at = ?, payment_source = NULL
        WHERE guild_id = ? AND status = 'open' AND forced = 0`).run(Date.now(), guildId).changes;
    return { pending: 0, economy, invoices };
});
module.exports = { resetEconomy };
