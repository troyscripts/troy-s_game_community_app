const fs = require("fs");
const path = require("path");

const config = require("../config/config");
const logger = require("../utils/logger");
const {
    db,
    dbPath,
    initializeDatabase,
    closeDatabase
} = require("./database");

const DATABASE_VERSION = 4;
const backupFolder = path.join(__dirname, "backups");
let backupTimer = null;

function initialize() {
    initializeDatabase();

    // Laadt servergebonden Discord-instellingen en bewaart een bestaande
    // config.js-installatie automatisch voor de reeds gebruikte server.
    require("./guildSettings").initialize();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS metadata (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    `).run();

    const row = db.prepare(
        "SELECT value FROM metadata WHERE key = ?"
    ).get("database_version");

    const currentVersion = row ? Number(row.value) : 0;

    if (currentVersion < DATABASE_VERSION) {
        db.prepare(`
            INSERT INTO metadata (key, value)
            VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `).run("database_version", String(DATABASE_VERSION));

        logger.database(
            `Database bijgewerkt van versie ${currentVersion} naar ${DATABASE_VERSION}.`
        );
    }

    const integrity = integrityCheck();
    if (integrity !== "ok") {
        throw new Error(`Database-integriteitscontrole mislukt: ${integrity}`);
    }

    logger.database("Database succesvol geïnitialiseerd.");
    return true;
}

async function createBackup() {
    fs.mkdirSync(backupFolder, { recursive: true });

    const backupFile = path.join(
        backupFolder,
        `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`
    );

    await db.backup(backupFile);
    pruneBackups(14);
    logger.database(`Databaseback-up gemaakt: ${path.basename(backupFile)}`);
    return backupFile;
}

function pruneBackups(maxFiles) {
    if (!fs.existsSync(backupFolder)) {
        return;
    }

    const backups = fs.readdirSync(backupFolder)
        .filter((file) => file.endsWith(".sqlite"))
        .map((file) => ({
            file,
            time: fs.statSync(path.join(backupFolder, file)).mtimeMs
        }))
        .sort((a, b) => b.time - a.time);

    for (const backup of backups.slice(maxFiles)) {
        fs.unlinkSync(path.join(backupFolder, backup.file));
    }
}

function startBackupSchedule() {
    if (!config.Database.Backup || backupTimer) {
        return;
    }

    createBackup().catch((error) => {
        logger.error(`Automatische databaseback-up mislukt: ${error.stack || error}`);
    });

    const hours = Math.max(1, Number(config.Database.BackupIntervalHours) || 24);
    backupTimer = setInterval(() => {
        createBackup().catch((error) => {
            logger.error(`Automatische databaseback-up mislukt: ${error.stack || error}`);
        });
    }, hours * 60 * 60 * 1000);
    backupTimer.unref();
}

function stopBackupSchedule() {
    if (backupTimer) {
        clearInterval(backupTimer);
        backupTimer = null;
    }
}

function optimize() {
    db.exec("PRAGMA optimize");
    logger.database("Database geoptimaliseerd.");
}

function integrityCheck() {
    return db.pragma("integrity_check", { simple: true });
}

function stats() {
    const tables = db.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
    `).all();

    return {
        path: dbPath,
        version: DATABASE_VERSION,
        tables: tables.length,
        tableNames: tables.map((table) => table.name)
    };
}

function close() {
    stopBackupSchedule();
    closeDatabase();
}

module.exports = {
    initialize,
    createBackup,
    startBackupSchedule,
    stopBackupSchedule,
    optimize,
    integrityCheck,
    stats,
    close
};
