const config = require("../config/config");
const logger = require("../utils/logger");

async function giveLevelRole(guild, userId, level) {
    const thresholds = Object.keys(config.Levels.Roles)
        .map(Number)
        .filter((threshold) => threshold <= level)
        .sort((a, b) => b - a);
    const roleId = config.Levels.Roles[thresholds[0]];

    if (!roleId) {
        return;
    }

    const role = guild.roles.cache.get(roleId);
    const member = guild.members.cache.get(userId) ||
        await guild.members.fetch(userId).catch(() => null);

    if (role && member && !member.roles.cache.has(roleId)) {
        await member.roles.add(role).catch((error) => {
            logger.warn(`Levelrol synchroniseren mislukt voor ${userId}: ${error.message}`);
        });
    }
}

module.exports = {
    giveLevelRole
};
