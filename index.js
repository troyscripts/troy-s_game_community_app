require("dotenv").config();

const {
    Client,
    Collection,
    GatewayIntentBits,
    Partials
} = require("discord.js");

const logger = require("./utils/logger");
const banner = require("./utils/banner");

const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessages
];

if (process.env.MESSAGE_CONTENT_INTENT !== "false") {
    intents.push(GatewayIntentBits.MessageContent);
}

const client = new Client({
    intents,
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.GuildMember
    ]
});

client.commands = new Collection();
client.buttons = new Collection();
client.modals = new Collection();
client.selectMenus = new Collection();
client.autocomplete = new Collection();
client.cooldowns = new Collection();
client.xpCooldowns = new Collection();

let databaseManager = null;
let started = false;
let shuttingDown = false;

process.on("unhandledRejection", (error) => {
    logger.error("Unhandled Promise Rejection:");
    logger.error(error?.stack || error);
});

process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception:");
    logger.error(error?.stack || error);
});

client.on("error", (error) => {
    logger.error(`Discord-clientfout: ${error.stack || error}`);
});

async function start() {
    if (started) {
        return client;
    }

    banner();

    if (!process.env.TOKEN) {
        throw new Error("TOKEN ontbreekt. Maak een .env-bestand op basis van .env.example.");
    }

    databaseManager = require("./database/manager");
    databaseManager.initialize();

    require("./handlers/eventHandler")(client);
    require("./handlers/commandHandler")(client);
    require("./handlers/buttonHandler")(client);
    require("./handlers/modalHandler")(client);
    require("./handlers/selectMenuHandler")(client);

    await client.login(process.env.TOKEN);
    databaseManager.startBackupSchedule();
    started = true;
    return client;
}

async function shutdown(signal) {
    if (shuttingDown) {
        return;
    }

    shuttingDown = true;
    logger.startup(`Bot wordt afgesloten (${signal}).`);

    try {
        require("./services/birthdayScheduler").stopBirthdayScheduler();
        require("./services/updateChecker").stopUpdateChecker();
        require("./services/versionReporter").stopVersionReporter();
        require("./services/connectionMonitor").stopConnectionMonitor();
        client.destroy();
        databaseManager?.close();
    } catch (error) {
        logger.error(`Fout tijdens afsluiten: ${error.stack || error}`);
        process.exitCode = 1;
    }
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

if (require.main === module) {
    start().catch((error) => {
        logger.error("Bot kon niet worden gestart:");
        logger.error(error.stack || error);
        databaseManager?.close();
        process.exitCode = 1;
    });
}

module.exports = client;
module.exports.start = start;
module.exports.shutdown = shutdown;
