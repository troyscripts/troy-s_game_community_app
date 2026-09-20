const { Events } = require("discord.js");

const guildSettings = require("../database/guildSettings");
const logger = require("../utils/logger");

const { registerGuild } = require("../services/commandRegistration");

module.exports = {
    name: Events.GuildCreate,

    async execute(client, guild) {
        guildSettings.ensureGuild(guild.id);
        await registerGuild(client, guild, { force: true });
        logger.event(`Guild-ID ${guild.id} automatisch herkend voor ${guild.name}.`);
    }
};
