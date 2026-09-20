const config = require("../config/config");
const defaults = require("../config/defaults");
const settingsSource = require("../config/settingsSource");
const logger = require("../utils/logger");
const { db } = require("./database");

const EDITABLE_ROOTS = [
    "Debug",
    "Prefix",
    "Bot",
    "Roles",
    "StaffRoles",
    "SelfRoles",
    "Logging",
    "Tickets",
    "Levels",
    "Economy",
    "Counting",
    "AIChat",
    "Birthday",
    "Agenda",
    "Welcome",
    "Leave",
    "StartupMessageScan",
    "StartupReport"
];

const GLOBAL_PATHS = ["Version", "Owners", "Developers", "Database", "Bot.Status"];
const cache = new Map();

function usesDefaults(guildId) {
    const id = String(settingsSource.DefaultsGuildId || "").trim();
    return /^\d{17,20}$/.test(id) && String(guildId) === id;
}

function assertDatabaseConfig(guildId) {
    if (usesDefaults(guildId)) {
        throw new Error("Deze server gebruikt config/defaults.js. Pas dat bestand aan en herstart de bot. De opgeslagen databaseconfiguratie blijft bewaard.");
    }
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function mergeObjects(base, override) {
    const merged = clone(base);
    if (!override || typeof override !== "object" || Array.isArray(override)) {
        return merged;
    }

    for (const [key, value] of Object.entries(override)) {
        if (value && typeof value === "object" && !Array.isArray(value) &&
            merged[key] && typeof merged[key] === "object" && !Array.isArray(merged[key])) {
            merged[key] = mergeObjects(merged[key], value);
        } else {
            merged[key] = clone(value);
        }
    }
    return merged;
}

function getPath(target, path) {
    return String(path).split(".").reduce((value, key) => value?.[key], target);
}

function setPath(target, path, value) {
    const parts = String(path).split(".");
    const finalKey = parts.pop();
    let current = target;

    for (const key of parts) {
        if (!current[key] || typeof current[key] !== "object" || Array.isArray(current[key])) {
            current[key] = {};
        }
        current = current[key];
    }

    current[finalKey] = value;
}

function deletePath(target, path) {
    const parts = String(path).split(".");
    const finalKey = parts.pop();
    const parent = parts.reduce((value, key) => value?.[key], target);
    if (parent && typeof parent === "object") {
        delete parent[finalKey];
    }
}

function pickEditable(source) {
    const editable = Object.fromEntries(
        EDITABLE_ROOTS.map((key) => [key, clone(source[key])])
    );
    delete editable.Bot.Status;
    return editable;
}

function createCleanServerConfig() {
    const clean = pickEditable(defaults);

    for (const key of Object.keys(clean.Roles)) clean.Roles[key] = "";
    clean.StaffRoles = [];
    for (const key of Object.keys(clean.SelfRoles)) clean.SelfRoles[key] = "";
    clean.Logging.Channel = "";
    clean.Tickets.Category = "";
    clean.Tickets.LogChannel = "";
    for (const key of Object.keys(clean.Levels.Roles)) clean.Levels.Roles[key] = "";
    clean.Counting.Channel = "";
    clean.Birthday.Role = "";
    clean.Birthday.Channel = "";
    clean.Welcome.Channel = "";
    clean.Welcome.AutoRole = "";
    clean.Leave.Channel = "";
    clean.StartupReport.Channel = "";

    return clean;
}

function mergeWithGlobals(serverConfig) {
    const merged = clone(defaults);
    for (const root of EDITABLE_ROOTS) {
        if (serverConfig[root] !== undefined) {
            merged[root] = clone(serverConfig[root]);
        }
    }

    // Deze waarden zijn procesbreed en kunnen niet veilig per Discord-server verschillen.
    merged.Version = defaults.Version;
    merged.Owners = clone(defaults.Owners);
    merged.Developers = clone(defaults.Developers);
    merged.Database = clone(defaults.Database);
    merged.Bot.Status = clone(defaults.Bot.Status);
    return merged;
}

function readStored(guildId) {
    const row = db.prepare(
        "SELECT config_json FROM settings WHERE guild_id = ?"
    ).get(String(guildId));

    if (!row?.config_json) return null;

    try {
        const parsed = JSON.parse(row.config_json);
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch (error) {
        logger.warn(`Ongeldige opgeslagen configuratie voor server ${guildId}: ${error.message}`);
        return null;
    }
}

function saveStored(guildId, serverConfig, source = "discord") {
    assertDatabaseConfig(guildId);
    const data = pickEditable(serverConfig);
    db.prepare(`
        INSERT INTO settings (guild_id, prefix, config_json, config_source, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(guild_id) DO UPDATE SET
            prefix = excluded.prefix,
            config_json = excluded.config_json,
            config_source = excluded.config_source,
            updated_at = excluded.updated_at
    `).run(
        String(guildId),
        String(data.Prefix || "!"),
        JSON.stringify(data),
        source,
        Math.floor(Date.now() / 1000)
    );
    cache.delete(String(guildId));
    return data;
}

function existingGuildIds() {
    const ids = new Set();
    const tables = db.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name
    `).all();

    for (const { name } of tables) {
        const columns = db.prepare(`PRAGMA table_info("${name.replaceAll('"', '""')}")`).all();
        if (!columns.some((column) => column.name === "guild_id")) continue;

        const quotedName = `"${name.replaceAll('"', '""')}"`;

        for (const row of db.prepare(
            `SELECT DISTINCT guild_id FROM ${quotedName} ` +
            "WHERE guild_id IS NOT NULL AND guild_id != ''"
        ).all()) {
            ids.add(String(row.guild_id));
        }
    }

    return [...ids];
}

function migrateLegacySettings() {
    const rows = db.prepare(`
        SELECT guild_id, prefix, welcome_channel, logs_channel, ticket_category, config_json
        FROM settings
    `).all();
    const ids = existingGuildIds();
    const envGuildId = /^\d{17,20}$/.test(process.env.GUILD_ID || "")
        ? process.env.GUILD_ID
        : null;
    const legacyGuildId = ids.length === 1 ? ids[0] : envGuildId;

    for (const row of rows) {
        if (row.config_json || usesDefaults(row.guild_id)) continue;

        const initial = row.guild_id === legacyGuildId
            ? pickEditable(defaults)
            : createCleanServerConfig();

        if (row.prefix) initial.Prefix = row.prefix;
        if (row.welcome_channel) initial.Welcome.Channel = row.welcome_channel;
        if (row.logs_channel) initial.Logging.Channel = row.logs_channel;
        if (row.ticket_category) initial.Tickets.Category = row.ticket_category;
        saveStored(row.guild_id, initial, row.guild_id === legacyGuildId ? "legacy" : "migration");
    }

    const hasStoredConfig = db.prepare(
        "SELECT 1 FROM settings WHERE config_json IS NOT NULL LIMIT 1"
    ).get();

    if (!hasStoredConfig && legacyGuildId && !usesDefaults(legacyGuildId)) {
        saveStored(legacyGuildId, pickEditable(defaults), "legacy");
        logger.database(
            `Bestaande config.js-instellingen bewaard voor Discord-server ${legacyGuildId}.`
        );
    }
}

function initialize() {
    migrateLegacySettings();
    config.__context.setProvider(getGuildConfig);
    if (usesDefaults(settingsSource.DefaultsGuildId)) {
        logger.database(`Server ${settingsSource.DefaultsGuildId} gebruikt config/defaults.js; andere servers gebruiken de database.`);
    }
}

function getServerConfig(guildId) {
    if (usesDefaults(guildId)) return pickEditable(defaults);
    const clean = createCleanServerConfig();
    const stored = readStored(guildId);
    return stored ? mergeObjects(clean, stored) : clean;
}

function getGuildConfig(guildId) {
    if (usesDefaults(guildId)) return mergeWithGlobals(pickEditable(defaults));
    const key = String(guildId);
    if (!cache.has(key)) {
        cache.set(key, mergeWithGlobals(getServerConfig(key)));
    }
    return cache.get(key);
}

function ensureGuild(guildId) {
    if (usesDefaults(guildId)) return false;
    const key = String(guildId);
    const row = db.prepare(
        "SELECT config_json FROM settings WHERE guild_id = ?"
    ).get(key);

    if (row?.config_json) return false;
    saveStored(key, createCleanServerConfig(), "automatic");
    logger.database(`Nieuwe Discord-serverconfiguratie aangemaakt voor guild ${key}.`);
    return true;
}

function getRegisteredGuildIds() {
    const guildIds = existingGuildIds()
        .filter((guildId) => /^\d{17,20}$/.test(guildId))
        .sort();

    // Een guild die bijvoorbeeld al in users staat, krijgt hier alsnog meteen
    // een eigen configuratieregel voordat de commands worden geregistreerd.
    for (const guildId of guildIds) {
        ensureGuild(guildId);
    }

    return guildIds;
}

function flattenPaths(value, prefix = "") {
    const paths = [];
    for (const [key, child] of Object.entries(value)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (child && typeof child === "object" && !Array.isArray(child)) {
            paths.push(...flattenPaths(child, path));
        } else {
            paths.push(path);
        }
    }
    return paths;
}

function getEditablePaths() {
    return flattenPaths(createCleanServerConfig());
}

function normalizePath(input) {
    const requested = String(input || "").trim();
    const match = getEditablePaths().find(
        (path) => path.toLowerCase() === requested.toLowerCase()
    );

    if (match) return match;
    if (/^levels\.roles\.\d+$/i.test(requested)) {
        const level = requested.split(".").at(-1);
        return `Levels.Roles.${level}`;
    }
    throw new Error("Onbekende instelling. Kies een instelling uit de keuzelijst.");
}

function extractDiscordId(value) {
    const match = String(value).trim().match(/^(?:<[@#]&?)?(\d{17,20})>?$/);
    return match?.[1] || null;
}

function parseValue(path, rawValue, currentValue) {
    const raw = String(rawValue).trim();
    if (path === "AIChat.Mode" && !["all", "mention"].includes(raw)) {
        throw new Error("Gebruik all (alle berichten) of mention (alleen @bot).");
    }
    if (path === "AIChat.Personality" && raw.length > 2000) {
        throw new Error("Gebruik maximaal 2000 tekens voor de persoonlijkheid.");
    }
    if (["AIChat.CooldownSeconds", "AIChat.HistoryTurns"].includes(path)) {
        const n = Number(raw);
        const min = path.endsWith("HistoryTurns") ? 0 : 1;
        const max = path.endsWith("HistoryTurns") ? 8 : 300;
        if (!Number.isInteger(n) || n < min || n > max) {
            throw new Error(`Gebruik een heel getal tussen ${min} en ${max}.`);
        }
    }

    if (typeof currentValue === "boolean") {
        const normalized = raw.toLowerCase();
        if (["ja", "true", "aan", "1"].includes(normalized)) return true;
        if (["nee", "false", "uit", "0"].includes(normalized)) return false;
        throw new Error("Gebruik `ja` of `nee` voor deze instelling.");
    }

    if (typeof currentValue === "number") {
        const number = Number(raw.replace(",", "."));
        if (!Number.isFinite(number) || number < 0) {
            throw new Error("Vul een geldig positief getal of 0 in.");
        }
        return number;
    }

    if (Array.isArray(currentValue)) {
        if (["leeg", "geen"].includes(raw.toLowerCase())) return [];

        let values;
        if (raw.startsWith("[")) {
            try {
                values = JSON.parse(raw);
            } catch {
                throw new Error("De lijst is geen geldige JSON-lijst.");
            }
        } else {
            values = raw.split(path === "Birthday.Messages" ? "|" : ",");
        }

        if (!Array.isArray(values)) throw new Error("De waarde moet een lijst zijn.");
        values = values.map((item) => String(item).trim()).filter(Boolean);

        if (path === "StaffRoles" || path === "AIChat.Channels") {
            const ids = values.map(extractDiscordId);
            if (ids.some((id) => !id)) {
                throw new Error("Gebruik geldige Discord-ID's of vermeldingen.");
            }
            return [...new Set(ids)];
        }
        return values;
    }

    const isIdPath = /^(Roles\.[^.]+|SelfRoles\.[^.]+|Logging\.Channel|Tickets\.(Category|LogChannel)|Levels\.Roles\.\d+|Counting\.Channel|Birthday\.(Role|Channel)|Welcome\.(Channel|AutoRole)|Leave\.Channel|StartupReport\.Channel)$/.test(path);
    if (isIdPath) {
        if (["leeg", "geen", "uit"].includes(raw.toLowerCase())) return "";
        const id = extractDiscordId(raw);
        if (!id) throw new Error("Gebruik een geldig Discord-ID of een kanaal-/rolvermelding.");
        return id;
    }

    if (path === "Bot.Color" && !/^#[0-9a-f]{6}$/i.test(raw)) {
        throw new Error("Gebruik een hexkleur zoals `#c9a91b`.");
    }

    if (path === "Prefix" && (raw.length < 1 || raw.length > 5)) {
        throw new Error("Een prefix moet tussen 1 en 5 tekens lang zijn.");
    }

    if (["Agenda.YouTubeUrl"].includes(path) &&
        ["leeg", "geen"].includes(raw.toLowerCase())) {
        return "";
    }

    if (["Bot.Name", "Bot.Footer", "Agenda.Title"].includes(path) && !raw) {
        throw new Error("Deze tekstinstelling mag niet leeg zijn.");
    }

    if (path.endsWith(".Timezone")) {
        try {
            new Intl.DateTimeFormat("nl-NL", { timeZone: raw }).format();
        } catch {
            throw new Error("Gebruik een geldige tijdzone, bijvoorbeeld `Europe/Amsterdam`.");
        }
    }

    if (path === "Birthday.CheckTime" && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(raw)) {
        throw new Error("Gebruik een tijd in het formaat `UU:MM`, bijvoorbeeld `09:00`.");
    }

    if (path === "Agenda.YouTubeUrl" && raw) {
        try {
            new URL(raw);
        } catch {
            throw new Error("Gebruik een geldige volledige URL.");
        }
    }

    return raw;
}

function updateValue(guildId, inputPath, rawValue) {
    assertDatabaseConfig(guildId);
    const path = normalizePath(inputPath);
    const serverConfig = getServerConfig(guildId);
    let currentValue = getPath(serverConfig, path);

    if (currentValue === undefined && /^Levels\.Roles\.\d+$/.test(path)) {
        currentValue = "";
    }

    const value = parseValue(path, rawValue, currentValue);
    setPath(serverConfig, path, value);
    saveStored(guildId, serverConfig);
    return { path, value, config: getGuildConfig(guildId) };
}

function resetValue(guildId, inputPath) {
    assertDatabaseConfig(guildId);
    const path = normalizePath(inputPath);
    const serverConfig = getServerConfig(guildId);
    const clean = createCleanServerConfig();
    const defaultValue = getPath(clean, path);

    if (defaultValue === undefined && /^Levels\.Roles\.\d+$/.test(path)) {
        deletePath(serverConfig, path);
    } else {
        setPath(serverConfig, path, clone(defaultValue));
    }

    saveStored(guildId, serverConfig);
    return { path, value: getPath(getGuildConfig(guildId), path) };
}

function resetGuild(guildId) {
    assertDatabaseConfig(guildId);
    saveStored(guildId, createCleanServerConfig(), "reset");
    return getGuildConfig(guildId);
}

function exportGuild(guildId) {
    return clone(getServerConfig(guildId));
}

module.exports = {
    GLOBAL_PATHS,
    usesDefaults,
    initialize,
    getGuildConfig,
    getServerConfig,
    ensureGuild,
    getRegisteredGuildIds,
    getEditablePaths,
    getPath,
    updateValue,
    resetValue,
    resetGuild,
    exportGuild,
    createCleanServerConfig
};
