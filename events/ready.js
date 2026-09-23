const { ActivityType, Events } = require("discord.js");

const config = require("../config/config");
const logger = require("../utils/logger");
const { scanStartupMessages } = require("../services/messageScanner");
const { startBirthdayScheduler } = require("../services/birthdayScheduler");
const startupReporter = require("../services/startupReporter");
const { startVersionReporter } = require("../services/versionReporter");
const guildSettings = require("../database/guildSettings");
const { startConnectionMonitor } = require("../services/connectionMonitor");

const { registerAllGuilds } = require("../services/commandRegistration");

const activityTypes = {
    PLAYING: ActivityType.Playing,
    LISTENING: ActivityType.Listening,
    WATCHING: ActivityType.Watching,
    COMPETING: ActivityType.Competing,
    STREAMING: ActivityType.Streaming
};

module.exports = {
    name: Events.ClientReady,
    once: true,

    async execute(client) {
        logger.success(`${client.user.tag} is online!`);
        logger.info(`Bot ID: ${client.user.id}`);
        logger.info(`Servers: ${client.guilds.cache.size}`);

        for (const guild of client.guilds.cache.values()) {
            guildSettings.ensureGuild(guild.id);
        }

        client.user.setPresence({
            activities: [{
                name: config.Bot.Status.Text,
                type: activityTypes[config.Bot.Status.Type] ?? ActivityType.Watching
            }],
            status: "online"
        });

        startVersionReporter(client);
        startConnectionMonitor(client);
        require("../services/updateChecker").startUpdateChecker();

        await registerAllGuilds(client);

        const reportMessage = await startupReporter.startReport(client);
        startBirthdayScheduler(client);

        try {
            const scan = await scanStartupMessages(client);
            await startupReporter.finishReport(reportMessage, client, scan);
            logger.startup("Ready-event en alle opstartcontroles succesvol uitgevoerd.");
        } catch (error) {
            await startupReporter.failReport(reportMessage, client, error);
            throw error;
        }
    }
};
