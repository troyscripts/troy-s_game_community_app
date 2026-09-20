const { applyRewardBonus, messageRewardMember } = require("./rewardBonus");
const config = require("../config/config");
const counting = require("../database/counting");
const levels = require("../database/levels");
const users = require("../database/users");
const { giveLevelRole } = require("./levelRoles");

function isCountingChannel(channelId) {
    return Boolean(
        config.Counting?.Enabled &&
        config.Counting.Channel &&
        channelId === config.Counting.Channel
    );
}

function parseNumber(content) {
    const text = String(content || "").trim();
    if (!/^(0|[1-9]\d*)$/.test(text)) {
        return null;
    }

    const number = Number(text);
    return Number.isSafeInteger(number) ? number : null;
}

function deleteLater(message) {
    const seconds = Math.max(0, Number(config.Counting.FeedbackDeleteSeconds) || 0);
    if (!message || !seconds) {
        return;
    }

    const timer = setTimeout(() => message.delete().catch(() => {}), seconds * 1000);
    timer.unref();
}

async function sendFeedback(message, result) {
    if (result.status === "accepted") {
        await message.react("✅").catch(() => {});
        return;
    }

    await message.react("❌").catch(() => {});
    const content = result.status === "repeat"
        ? "🚫 Niet 2x achter elkaar!"
        : "💥 Fout! Reset naar **0**";
    const reply = await message.reply({
        content,
        allowedMentions: { repliedUser: false }
    }).catch(() => null);
    deleteLater(reply);
}

async function processCountingMessage(message, { silent = false, awardXP = true } = {}) {
    if (!isCountingChannel(message.channelId || message.channel?.id) || message.author?.bot) {
        return { handled: false, xpAwarded: false };
    }

    users.createUser(message.author, message.guild);
    const result = counting.submitNumber({
        channelId: message.channelId || message.channel.id,
        guildId: message.guild.id,
        userId: message.author.id,
        number: parseNumber(message.content)
    });

    let xpAwarded = false;
    if (result.status === "accepted" && awardXP && config.Levels.Enabled) {
        const reward = Math.max(0, Number(config.Counting.RewardXP) || 0);
        if (reward) {
            const bonusMember = await messageRewardMember(message);
            const xpResult = levels.addXP({
                userId: message.author.id,
                guildId: message.guild.id,
                amount: applyRewardBonus(reward, bonusMember),
                timestamp: message.createdTimestamp || Date.now(),
                cooldownMs: 0
            });
            xpAwarded = xpResult.awarded;

            if (xpResult.leveledUp) {
                await giveLevelRole(message.guild, message.author.id, xpResult.newLevel);
            }
        }
    }

    if (!silent) {
        await sendFeedback(message, result);
    }

    return {
        handled: true,
        xpAwarded,
        ...result
    };
}

function initializeFromMessages(channelId, guildId, messages) {
    if (!isCountingChannel(channelId) || counting.getState(channelId)) {
        return;
    }

    const newestUserMessage = [...messages.values()]
        .filter((message) => !message.author?.bot)
        .sort((a, b) => BigInt(a.id) > BigInt(b.id) ? -1 : 1)[0];

    if (!newestUserMessage) {
        counting.setState(channelId, guildId, 0, null);
        return;
    }

    const number = parseNumber(newestUserMessage.content);
    counting.setState(
        channelId,
        guildId,
        Number.isSafeInteger(number) && number > 0 ? number : 0,
        Number.isSafeInteger(number) && number > 0 ? newestUserMessage.author.id : null
    );
}

function needsInitialization(channelId) {
    return isCountingChannel(channelId) && !counting.getState(channelId);
}

module.exports = {
    isCountingChannel,
    parseNumber,
    processCountingMessage,
    initializeFromMessages,
    needsInitialization
};
