const logger = require('../utils/logger');
const config = require('../config/config');
const users = require('../database/users');
const { eventEmbed, sendEmbed, sendLog } = require('../utils/eventEmbeds');

module.exports = {
    name: 'guildMemberAdd',
    async execute(_client, member) {
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
            `👋 Welkom <@${member.id}> bij **${config.Bot.Name}**!\n\n` +
            `**Aantal leden:** ${member.guild.memberCount}\n` +
            'Lees eerst de regels en verifieer jezelf om toegang te krijgen.',
            `Gebruiker-ID: ${member.id} | Server-ID: ${member.guild.id}`);
        let delivered;
        if (config.Welcome?.Enabled) {
            if (await sendEmbed(member.guild, config.Welcome.Channel, embed)) delivered = config.Welcome.Channel;
        }
        await sendLog(member.guild, embed, delivered);
    }
};
