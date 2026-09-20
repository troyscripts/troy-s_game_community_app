const logger = require('../utils/logger');
const config = require('../config/config');
const { eventEmbed, sendEmbed, sendLog } = require('../utils/eventEmbeds');
module.exports = {
    name: 'guildMemberRemove',
    async execute(_client, member) {
        logger.event(`${member.user?.tag || member.id} heeft de server verlaten.`);
        const embed = eventEmbed('Lid vertrokken', 0xED4245,
            `👋 <@${member.id}> heeft **${config.Bot.Name}** verlaten.\n\n` +
            `**Aantal leden:** ${member.guild.memberCount}\nWe hopen je nog eens terug te zien!`,
            `Gebruiker-ID: ${member.id} | Server-ID: ${member.guild.id}`);
        let delivered;
        if (config.Leave?.Enabled) {
            if (await sendEmbed(member.guild, config.Leave.Channel, embed)) delivered = config.Leave.Channel;
        }
        await sendLog(member.guild, embed, delivered);
    }
};
