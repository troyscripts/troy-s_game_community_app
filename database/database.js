const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const config = require("../config/config");
const logger = require("../utils/logger");

const dbPath = path.resolve(__dirname, "..", config.Database.File);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");

function hasColumn(table, column) {
    return db.prepare(`PRAGMA table_info(${table})`).all()
        .some((item) => item.name === column);
}

function addColumn(table, definition) {
    const column = definition.trim().split(/\s+/)[0];

    if (!hasColumn(table, column)) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
        logger.database(`Databasekolom toegevoegd: ${table}.${column}`);
    }
}

function initializeDatabase() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            username TEXT,
            global_name TEXT,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
            PRIMARY KEY (user_id, guild_id)
        );

        CREATE TABLE IF NOT EXISTS birthdays (
            user_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            birthday TEXT NOT NULL,
            PRIMARY KEY (user_id, guild_id)
        );

        CREATE TABLE IF NOT EXISTS warnings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            moderator_id TEXT NOT NULL,
            reason TEXT NOT NULL,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
        );

        CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            channel_id TEXT UNIQUE NOT NULL,
            category TEXT NOT NULL DEFAULT 'support',
            claimed_by TEXT,
            status TEXT NOT NULL DEFAULT 'open',
            created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
            closed_at INTEGER
        );

        CREATE TABLE IF NOT EXISTS levels (
            user_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            xp INTEGER NOT NULL DEFAULT 0,
            level INTEGER NOT NULL DEFAULT 1,
            messages INTEGER NOT NULL DEFAULT 0,
            last_xp INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (user_id, guild_id)
        );

        CREATE TABLE IF NOT EXISTS economy (
            user_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            wallet INTEGER NOT NULL DEFAULT 0,
            bank INTEGER NOT NULL DEFAULT 0,
            last_daily INTEGER NOT NULL DEFAULT 0,
            last_work INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (user_id, guild_id)
        );

        CREATE TABLE IF NOT EXISTS settings (
            guild_id TEXT PRIMARY KEY,
            prefix TEXT NOT NULL DEFAULT '!',
            welcome_channel TEXT,
            logs_channel TEXT,
            ticket_category TEXT,
            config_json TEXT,
            config_source TEXT,
            updated_at INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
        );

        CREATE TABLE IF NOT EXISTS channel_state (
            channel_id TEXT PRIMARY KEY,
            guild_id TEXT NOT NULL,
            last_message_id TEXT,
            last_scanned_at INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS scheduler_state (
            task TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            last_run TEXT,
            PRIMARY KEY (task, guild_id)
        );

        CREATE TABLE IF NOT EXISTS counting_state (
            channel_id TEXT PRIMARY KEY,
            guild_id TEXT NOT NULL,
            current_number INTEGER NOT NULL DEFAULT 0,
            last_user_id TEXT,
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
        );

        CREATE TABLE IF NOT EXISTS youtube_agenda (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            scheduled_at INTEGER NOT NULL,
            created_by TEXT NOT NULL,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
        );

        CREATE TABLE IF NOT EXISTS youtube_agenda_messages (
            guild_id TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            message_id TEXT NOT NULL,
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
            PRIMARY KEY (guild_id, channel_id)
        );

        CREATE INDEX IF NOT EXISTS idx_birthdays_guild ON birthdays(guild_id);
        CREATE INDEX IF NOT EXISTS idx_warnings_user ON warnings(guild_id, user_id);
        CREATE INDEX IF NOT EXISTS idx_tickets_user_status ON tickets(guild_id, user_id, status);
        CREATE INDEX IF NOT EXISTS idx_levels_rank ON levels(guild_id, level DESC, xp DESC);
        CREATE INDEX IF NOT EXISTS idx_economy_rank ON economy(guild_id, wallet DESC, bank DESC);
        CREATE INDEX IF NOT EXISTS idx_counting_guild ON counting_state(guild_id);
        CREATE INDEX IF NOT EXISTS idx_youtube_agenda_guild_date
            ON youtube_agenda(guild_id, scheduled_at, id);
    `);

    // Migratie voor oudere v2-bestanden waarin deze kolommen nog niet bestonden.
    addColumn("tickets", "staff_thread_id TEXT");
    addColumn("tickets", "staff_roles_json TEXT");
    addColumn("tickets", "transcript_dm_sent_at INTEGER");
    addColumn("economy", "last_daily INTEGER NOT NULL DEFAULT 0");
    addColumn("economy", "last_work INTEGER NOT NULL DEFAULT 0");
    addColumn("levels", "last_xp INTEGER NOT NULL DEFAULT 0");
    addColumn("settings", "config_json TEXT");
    addColumn("settings", "config_source TEXT");
    addColumn("settings", "updated_at INTEGER NOT NULL DEFAULT 0");

    logger.database(`Database tabellen gecontroleerd: ${dbPath}`);
}

function closeDatabase() {
    if (db.open) {
        db.close();
    }
}

module.exports = {
    db,
    dbPath,
    initializeDatabase,
    closeDatabase
};
