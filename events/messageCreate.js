const { applyRewardBonus } = require("../services/rewardBonus");
const { Events } = require("discord.js");

const config = require("../config/config");
const levels = require("../database/levels");
const users = require("../database/users");
const channelState = require("../database/channelState");
const { processCountingMessage } = require("../services/countingGame");
const { giveLevelRole } = require("../services/levelRoles");

const { processAIMessage } = require("../services/aiChat");
const logger = require("../utils/logger");

function randomXP() {
    const minimum = Math.max(1, Number(config.Levels.XPMin) || 5);
    const maximum = Math.max(minimum, Number(config.Levels.XPMax) || 14);
    return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}

module.exports = {
    name: Events.MessageCreate,

    async execute(client, message) {
        if (!message.guild) {
            return;
        }

        if (message.author.bot) {
            channelState.setChannelState(message.channel.id, message.guild.id, message.id);
            return;
        }

        const countingResult = await processCountingMessage(message);
        if (countingResult.handled) {
            channelState.setChannelState(message.channel.id, message.guild.id, message.id);
            return;
        }

        users.createUser(message.author, message.guild);

        // De bot gebruikt slashcommands. Oude prefixberichten worden niet als slashcommand uitgevoerd.
        if (message.content?.startsWith(config.Prefix)) {
            channelState.setChannelState(message.channel.id, message.guild.id, message.id);
            return;
        }

        // Runs independently so a slow API never blocks XP or channel state.
        void processAIMessage(client, message).catch(() => logger.warn("AI-chat kon dit bericht niet verwerken."));

        if (!config.Levels.Enabled || !message.member) {
            channelState.setChannelState(message.channel.id, message.guild.id, message.id);
            return;
        }

        const cooldown = Math.max(1, Number(config.Levels.Cooldown) || 60) * 1000;

        const result = levels.addXP({
            userId: message.author.id,
            guildId: message.guild.id,
            amount: applyRewardBonus(randomXP(), message.member),
            timestamp: message.createdTimestamp || Date.now(),
            cooldownMs: cooldown
        });

        if (result.leveledUp) {
            await giveLevelRole(message.guild, message.author.id, result.newLevel);

            if (config.Levels.AnnounceLevelUp) {
                await message.channel.send({
                    content: `🎉 ${message.author}, je bent nu **level ${result.newLevel}**!`,
                    allowedMentions: { users: [message.author.id] }
                }).catch(() => {});
            }
        }

        channelState.setChannelState(message.channel.id, message.guild.id, message.id);
    }
};
