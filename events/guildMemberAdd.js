const logger = require('../utils/logger');
const settings = require('../database/guildSettings');
const users = require('../database/users');
const { eventEmbed, sendEmbed, sendLog } = require('../utils/eventEmbeds');
const { renderWelcome } = require('../utils/welcomeMessage');

module.exports = {
    name: 'guildMemberAdd',
    async execute(_client, member) {
        const config = settings.getGuildConfig(member.guild.id);
        try { users.createUser(member.user, member.guild); }
        catch (error) { logger.error(error); }
        logger.event(`${member.user.tag} is de server binnengekomen.`);
        if (config.Welcome?.AutoRole) {
            const role = member.guild.roles.cache.get(config.Welcome.AutoRole);
            if (role) {
                try {
                    await member.roles.add(role);
                    logger.success(`Rol ${role.name} gegeven aan ${member.user.tag}`);
                } catch (error) { logger.error(error); }
            }
        }
        const embed = eventEmbed('Lid toegetreden', 0x57F287,
            renderWelcome(config.Welcome?.Message, member),
            `Gebruiker-ID: ${member.id} | Server-ID: ${member.guild.id}`);
        let delivered;
        if (config.Welcome?.Enabled) {
            if (await sendEmbed(member.guild, config.Welcome.Channel, embed)) delivered = config.Welcome.Channel;
        }
        await sendLog(member.guild, embed, delivered);
    }
};
