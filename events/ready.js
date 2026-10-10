const { ActivityType, Events } = require("discord.js");

const { statusText } = require("../utils/botIdentity");
const logger = require("../utils/logger");
const { scanStartupMessages } = require("../services/messageScanner");
const { startBirthdayScheduler } = require("../services/birthdayScheduler");
const startupReporter = require("../services/startupReporter");
const { startVersionReporter } = require("../services/versionReporter");
const guildSettings = require("../database/guildSettings");
const { startConnectionMonitor } = require("../services/connectionMonitor");

const { registerAllGuilds } = require("../services/commandRegistration");

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
                name: statusText,
                type: ActivityType.Watching
            }],
            status: "online"
        });

        startVersionReporter(client);
        startConnectionMonitor(client);
        require("../services/updateChecker").startUpdateChecker();

        require("../services/polls").start(client);

        await registerAllGuilds(client);

        const reportMessage = await startupReporter.startReport(client);
        startBirthdayScheduler(client);
        require("../services/notifyService").startNotify(client);

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
