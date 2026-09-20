const { AsyncLocalStorage } = require("async_hooks");
const defaults = require("./defaults");

const storage = new AsyncLocalStorage();
let settingsProvider = null;
// De provider is synchroon. Een logger die tijdens het laden configuratie
// leest, mag dezelfde provider niet opnieuw aanroepen.
const resolvingGuilds = new Set();

function getActiveConfig() {
    const guildId = storage.getStore();
    if (!guildId || !settingsProvider || resolvingGuilds.has(guildId)) {
        return defaults;
    }

    resolvingGuilds.add(guildId);
    try {
        return settingsProvider(guildId) || defaults;
    } finally {
        resolvingGuilds.delete(guildId);
    }
}

const context = Object.freeze({
    defaults,
    setProvider(provider) {
        if (typeof provider !== "function") {
            throw new TypeError("De configuratieprovider moet een functie zijn.");
        }
        settingsProvider = provider;
    },
    run(guildId, callback) {
        return guildId ? storage.run(String(guildId), callback) : callback();
    },
    getGuildId() {
        return storage.getStore() || null;
    },
    get() {
        return getActiveConfig();
    }
});

module.exports = new Proxy({}, {
    get(_target, property) {
        return property === "__context" ? context : getActiveConfig()[property];
    },
    has(_target, property) {
        return property === "__context" || property in getActiveConfig();
    },
    ownKeys() {
        return Reflect.ownKeys(getActiveConfig());
    },
    getOwnPropertyDescriptor(_target, property) {
        if (property === "__context" || property in getActiveConfig()) {
            return { configurable: true, enumerable: property !== "__context" };
        }
        return undefined;
    }
});
