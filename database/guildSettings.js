const { tr } = require("../utils/localization");
const config = require("../config/config");
const defaults = require("../config/defaults");
const logger = require("../utils/logger");
const { db } = require("./database");

const EDITABLE_ROOTS = [
    "Debug",
    "Prefix",
    "Bot",
    "Roles",
    "StaffRoles",
    "SelfRoles",
    "Notify",
    "Radio",
    "Bump",
    "Store",
    "Logging",
    "Honeypot",
    "SoftModeration",
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
const { getWelcomeTemplate } = require("../utils/welcomeMessage");

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
    editable.Welcome.Message = getWelcomeTemplate(editable.Welcome.Message);
    delete editable.Bot.Status;
    return editable;
}

function createCleanServerConfig() {
    const clean = pickEditable(defaults);

    for (const key of Object.keys(clean.Roles)) clean.Roles[key] = "";
    clean.StaffRoles = [];
    for (const key of Object.keys(clean.Notify)) clean.Notify[key] = "";
    for (const key of Object.keys(clean.SelfRoles)) clean.SelfRoles[key] = "";
    clean.Bump.Channel = "";
    clean.Store.VIPRole = "";
    clean.Logging.Channel = "";
    for (const key of Object.keys(clean.Logging.Channels)) clean.Logging.Channels[key] = "";
    clean.Honeypot.Channel = "";
    clean.Honeypot.LogChannel = "";
    clean.Honeypot.Enabled = false;
    clean.Honeypot.CrossServerBan = false;
    clean.Tickets.Category = "";
    clean.Tickets.LogChannel = "";
    clean.Tickets.ThreadLogChannel = "";
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
        if (row.config_json) continue;

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

    if (!hasStoredConfig && legacyGuildId) {
        saveStored(legacyGuildId, pickEditable(defaults), "legacy");
        logger.database(
            `Bestaande config.js-instellingen bewaard voor Discord-server ${legacyGuildId}.`
        );
    }
}

function initialize() {
    migrateLegacySettings();
    config.__context.setProvider(getGuildConfig);
}

function getServerConfig(guildId) {
    const clean = createCleanServerConfig();
    const stored = readStored(guildId);
    return stored ? mergeObjects(clean, stored) : clean;
}

function getGuildConfig(guildId) {
    const key = String(guildId);
    if (!cache.has(key)) {
        cache.set(key, mergeWithGlobals(getServerConfig(key)));
    }
    return cache.get(key);
}

function ensureGuild(guildId) {
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
    throw new Error(tr("Onbekende instelling. Kies een instelling uit de keuzelijst."));
}

function extractDiscordId(value) {
    const match = String(value).trim().match(/^(?:<[@#]&?)?(\d{17,20})>?$/);
    return match?.[1] || null;
}

function parseValue(path, rawValue, currentValue) {
    const raw = String(rawValue).trim();
    if (["Bot.Language", "Logging.Language"].includes(path)) {
        const aliases = { nl: "nl", nederlands: "nl", dutch: "nl", en: "en", engels: "en", english: "en", both: "both", beide: "both", tweetalig: "both" };
        const language = aliases[raw.toLowerCase()];
        if (!language) throw new Error(tr("Gebruik nl (Nederlands), en (Engels) of both (beide talen)."));
        return language;
    }
    if (["Logging.RetentionDays", "Logging.MaxRecords", "Logging.QueueLimit"].includes(path)) {
        const ranges = {"Logging.RetentionDays":[1,365],"Logging.MaxRecords":[100,100000],"Logging.QueueLimit":[10,10000]};
        const [min,max]=ranges[path], n=Number(raw);
        if(!Number.isInteger(n)||n<min||n>max)throw new Error(`Gebruik een geheel getal tussen ${min} en ${max}.`);
        return n;
    }
    if (path.startsWith("SoftModeration.")) {
        const ranges = { TimeoutHours: [1, 672], RepeatWindowHours: [1, 720], MinConfidence: [0.8, 1], AdultMinConfidence: [0.9, 1], SpamMessages: [3, 50], SpamWindowSeconds: [2, 120], MentionLimit: [3, 50], QueueLimit: [10, 1000] };
        const key = path.split(".")[1];
        if (ranges[key]) {
            const n = Number(raw); const [min, max] = ranges[key];
            if (!Number.isFinite(n) || n < min || n > max || (!["MinConfidence","AdultMinConfidence"].includes(key) && !Number.isInteger(n))) throw new Error(`Gebruik een getal tussen ${min} en ${max}.`);
            return n;
        }
    }
    if (path === "Honeypot.Mention") {
        const aliases = {verified:"verified",geverifieerd:"verified",none:"none",geen:"none",uit:"none",everyone:"everyone","@everyone":"everyone",here:"here","@here":"here"};
        const value = aliases[raw.toLowerCase()] || extractDiscordId(raw);
        if (!value) throw new Error(tr("Kies verified, none, everyone, here of een rolvermelding/rol-ID."));
        return value;
    }
    if (path === "Honeypot.Action") {
        const action = raw.toLowerCase();
        if (!["ban", "timeout"].includes(action)) throw new Error(tr("Gebruik ban of timeout (7 dagen)."));
        return action;
    }
    if (path === "AIChat.Mode" && !["all", "mention"].includes(raw)) {
        throw new Error(tr("Gebruik all (alle berichten) of mention (alleen @bot)."));
    }
    if (path === "Welcome.Message" && (!raw || raw.length > 4000)) {
        throw new Error(tr("Gebruik een tekst van 1 tot 4000 tekens."));
    }
    if (path === "AIChat.Personality" && raw.length > 2000) {
        throw new Error(tr("Gebruik maximaal 2000 tekens voor de persoonlijkheid."));
    }
    if (["AIChat.CooldownSeconds", "AIChat.HistoryTurns"].includes(path)) {
        const n = Number(raw);
        const min = path.endsWith("HistoryTurns") ? 0 : 1;
        const max = path.endsWith("HistoryTurns") ? 8 : 300;
        if (!Number.isInteger(n) || n < min || n > max) {
            throw new Error(tr("Gebruik een heel getal tussen {0} en {1}.", min, max));
        }
    }

    if (path.startsWith("Radio.Stations.") && path.endsWith(".Url")) {
        if (["leeg", "geen", "empty", "none", ""].includes(raw.toLowerCase())) return "";
        return require("../services/radioService").validateUrl(raw);
    }
    if (path.startsWith("Radio.Stations.") && path.endsWith(".Name") && raw.length > 80)
        throw new Error(tr("Gebruik maximaal 80 tekens voor de zendernaam."));
    if (["Radio.DefaultVolume", "Radio.EmptySeconds"].includes(path)) {
        const min = path.endsWith("EmptySeconds") ? 5 : 0;
        const max = path.endsWith("EmptySeconds") ? 3600 : 100;
        const n = Number(raw);
        if (!Number.isInteger(n) || n < min || n > max) throw new Error(tr("Gebruik een heel getal tussen {0} en {1}.", min, max));
        return n;
    }
    if (typeof currentValue === "boolean") {
        const normalized = raw.toLowerCase();
        if (["ja", "yes", "true", "aan", "on", "1"].includes(normalized)) return true;
        if (["nee", "no", "false", "uit", "off", "0"].includes(normalized)) return false;
        throw new Error(tr("Gebruik `ja` of `nee` voor deze instelling."));
    }

    if (typeof currentValue === "number") {
        const number = Number(raw.replace(",", "."));
        if (!Number.isFinite(number) || number < 0) {
            throw new Error(tr("Vul een geldig positief getal of 0 in."));
        }
        return number;
    }

    if (Array.isArray(currentValue)) {
        if (["leeg", "geen", "empty", "none"].includes(raw.toLowerCase())) return [];

        let values;
        if (raw.startsWith("[")) {
            try {
                values = JSON.parse(raw);
            } catch {
                throw new Error(tr("De lijst is geen geldige JSON-lijst."));
            }
        } else {
            values = raw.split(path === "Birthday.Messages" ? "|" : ",");
        }

        if (!Array.isArray(values)) throw new Error(tr("De waarde moet een lijst zijn."));
        values = values.map((item) => String(item).trim()).filter(Boolean);

        if (["Logging.IgnoredAuthors", "Logging.IgnoredUserMentions", "Logging.IgnoredRoleMentions"].includes(path)) {
            const role = path === "Logging.IgnoredRoleMentions";
            const pattern = role ? /^(?:<@&(\d{17,20})>|(\d{17,20}))$/ : /^(?:<@!?(\d{17,20})>|(\d{17,20}))$/;
            const ids = values.map(value => { const match = value.match(pattern); return match && (match[1] || match[2]); });
            if (ids.some(id => !id) || ids.length > 100) throw new Error("Gebruik maximaal 100 geldige " + (role ? "rol" : "gebruikers") + "-ID's of mentions, gescheiden door komma's.");
            return [...new Set(ids)];
        }
        if (path === "StaffRoles" || path === "AIChat.Channels") {
            const ids = values.map(extractDiscordId);
            if (ids.some((id) => !id)) {
                throw new Error(tr("Gebruik geldige Discord-ID's of vermeldingen."));
            }
            return [...new Set(ids)];
        }
        return values;
    }

    const isIdPath = /^(Notify\.PingRole[1-4]|Roles\.[^.]+|SelfRoles\.[^.]+|SoftModeration\.LogChannel|Store\.VIPRole|Bump\.Channel|Honeypot\.(Channel|LogChannel)|Logging\.(Channel|Channels\.[^.]+)|Tickets\.(Category|LogChannel|ThreadLogChannel)|Levels\.Roles\.\d+|Counting\.Channel|Birthday\.(Role|Channel)|Welcome\.(Channel|AutoRole)|Leave\.Channel|StartupReport\.Channel)$/.test(path);
    if (isIdPath) {
        if (["leeg", "geen", "uit", "empty", "none", "off"].includes(raw.toLowerCase())) return "";
        const id = extractDiscordId(raw);
        if (!id) throw new Error(tr("Gebruik een geldig Discord-ID of een kanaal-/rolvermelding."));
        return id;
    }

    if (path === "Bot.Color" && !/^#[0-9a-f]{6}$/i.test(raw)) {
        throw new Error(tr("Gebruik een hexkleur zoals `#c9a91b`."));
    }

    if (path === "Prefix" && (raw.length < 1 || raw.length > 5)) {
        throw new Error(tr("Een prefix moet tussen 1 en 5 tekens lang zijn."));
    }

    if (["Agenda.YouTubeUrl"].includes(path) &&
        ["leeg", "geen", "empty", "none"].includes(raw.toLowerCase())) {
        return "";
    }

    if (["Bot.Name", "Bot.Footer", "Agenda.Title"].includes(path) && !raw) {
        throw new Error(tr("Deze tekstinstelling mag niet leeg zijn."));
    }

    if (path.endsWith(".Timezone")) {
        try {
            new Intl.DateTimeFormat("nl-NL", { timeZone: raw }).format();
        } catch {
            throw new Error(tr("Gebruik een geldige tijdzone, bijvoorbeeld `Europe/Amsterdam`."));
        }
    }

    if (path === "Birthday.CheckTime" && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(raw)) {
        throw new Error(tr("Gebruik een tijd in het formaat `UU:MM`, bijvoorbeeld `09:00`."));
    }

    if (path === "Agenda.YouTubeUrl" && raw) {
        try {
            new URL(raw);
        } catch {
            throw new Error(tr("Gebruik een geldige volledige URL."));
        }
    }

    return raw;
}

function updateValue(guildId, inputPath, rawValue) {
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
    saveStored(guildId, createCleanServerConfig(), "reset");
    return getGuildConfig(guildId);
}

function exportGuild(guildId) {
    return clone(getServerConfig(guildId));
}


function setWelcomeMessage(guildId, message) {
    const value = String(message || "").replace(/\r\n?/g, "\n").replaceAll("\\n", "\n").trim();
    if (!value || value.length > 4000) throw new Error(tr("Gebruik een tekst van 1 tot 4000 tekens."));
    updateValue(guildId, "Welcome.Message", value);
    cache.delete(String(guildId));
    return value;
}

module.exports = {
    GLOBAL_PATHS,
    initialize,
    getGuildConfig,
    getServerConfig,
    ensureGuild,
    getRegisteredGuildIds,
    getEditablePaths,
    getPath,
    updateValue,
    setWelcomeMessage,
    resetValue,
    resetGuild,
    exportGuild,
    createCleanServerConfig
};
