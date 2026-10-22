const { tr } = require("../utils/localization");
const logger = require('../utils/logger');
const config = require('../config/config');
const { eventEmbed, sendEmbed, sendLog } = require('../utils/eventEmbeds');
module.exports = {
    name: 'guildMemberRemove',
    async execute(_client, member) {
        logger.event(`${member.user?.tag || member.id} heeft de server verlaten.`);
        const embed = eventEmbed(tr("Lid vertrokken"), 0xED4245,
            tr("👋 <@{0}> heeft **{1}** verlaten.\n\n", member.id, config.Bot.Name) +
            tr("**Aantal leden:** {0}\nWe hopen je nog eens terug te zien!", member.guild.memberCount),
            tr("Gebruiker-ID: {0} | Server-ID: {1}", member.id, member.guild.id));
        let delivered;
        if (config.Leave?.Enabled) {
            if (await sendEmbed(member.guild, config.Leave.Channel, embed)) delivered = config.Leave.Channel;
        }
        await sendLog(member.guild, embed, delivered);
    }
};
