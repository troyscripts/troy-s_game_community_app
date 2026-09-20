const { applyRewardBonus, messageRewardMember } = require("./rewardBonus");
const { PermissionFlagsBits } = require("discord.js");

const config = require("../config/config");
const logger = require("../utils/logger");
const users = require("../database/users");
const levels = require("../database/levels");
const channelState = require("../database/channelState");
const {
    initializeFromMessages,
    isCountingChannel,
    needsInitialization,
    processCountingMessage
} = require("./countingGame");
const { giveLevelRole } = require("./levelRoles");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isAfter(messageId, referenceId) {
    try {
        return BigInt(messageId) > BigInt(referenceId);
    } catch {
        return messageId !== referenceId;
    }
}

function oldestMessageId(messages) {
    let oldest = null;

    for (const message of messages.values()) {
        if (!oldest) {
            oldest = message.id;
            continue;
        }

        if (BigInt(message.id) < BigInt(oldest)) {
            oldest = message.id;
        }
    }

    return oldest;
}

function newestMessageId(messages) {
    let newest = null;

    for (const message of messages.values()) {
        if (!newest) {
            newest = message.id;
            continue;
        }

        if (BigInt(message.id) > BigInt(newest)) {
            newest = message.id;
        }
    }

    return newest;
}

function rememberUsers(messages, guild) {
    for (const message of messages.values()) {
        if (!message.author?.bot) {
            users.createUser(message.author, guild);
        }
    }
}

function randomXP() {
    const minimum = Math.max(1, Number(config.Levels.XPMin) || 5);
    const maximum = Math.max(minimum, Number(config.Levels.XPMax) || 14);
    return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}

async function processNewMessages(messages, guild) {
    const cooldownMs = Math.max(1, Number(config.Levels.Cooldown) || 60) * 1000;
    const ordered = [...messages]
        .sort((a, b) => BigInt(a.id) < BigInt(b.id) ? -1 : 1);
    let processed = 0;
    let xpAwards = 0;

    for (const message of ordered) {
        if (message.author?.bot) {
            continue;
        }

        if (isCountingChannel(message.channelId || message.channel?.id)) {
            const result = await processCountingMessage(message, {
                silent: true,
                awardXP: config.StartupMessageScan.ProcessMissedXP !== false
            });
            processed += 1;
            if (result.xpAwarded) {
                xpAwards += 1;
            }
            continue;
        }

        if (message.content?.startsWith(config.Prefix)) {
            continue;
        }

        users.createUser(message.author, guild);
        processed += 1;

        if (!config.Levels.Enabled || config.StartupMessageScan.ProcessMissedXP === false) {
            continue;
        }

        const bonusMember = await messageRewardMember(message);
        const result = levels.addXP({
            userId: message.author.id,
            guildId: guild.id,
            amount: applyRewardBonus(randomXP(), bonusMember),
            timestamp: message.createdTimestamp || Date.now(),
            cooldownMs
        });

        if (result.awarded) {
            xpAwards += 1;
        }

        if (result.leveledUp) {
            await giveLevelRole(guild, message.author.id, result.newLevel);
        }
    }

    return { processed, xpAwards };
}

async function scanChannel(channel, clientUser) {
    if (!channel.isTextBased?.() || !channel.messages?.fetch) {
        return { scanned: false, messages: 0, processed: 0, xpAwards: 0 };
    }

    const permissions = channel.permissionsFor?.(clientUser);
    if (!permissions?.has(PermissionFlagsBits.ViewChannel) ||
        !permissions.has(PermissionFlagsBits.ReadMessageHistory)) {
        return { scanned: false, messages: 0, processed: 0, xpAwards: 0 };
    }

    const state = channelState.getChannelState(channel.id);
    const newestKnown = channel.lastMessageId;

    if (!newestKnown) {
        channelState.setChannelState(channel.id, channel.guild.id, null);
        return { scanned: true, messages: 0, processed: 0, xpAwards: 0 };
    }

    if (state?.last_message_id && needsInitialization(channel.id)) {
        let anchorMessages = await channel.messages.fetch({
            around: state.last_message_id,
            limit: 1
        }).catch(() => null);

        const anchorHasUser = anchorMessages &&
            [...anchorMessages.values()].some((message) => !message.author?.bot);

        if (!anchorHasUser) {
            anchorMessages = await channel.messages.fetch({
                before: state.last_message_id,
                limit: 100
            }).catch(() => anchorMessages);
        }

        if (anchorMessages) {
            initializeFromMessages(channel.id, channel.guild.id, anchorMessages);
        }
    }

    let found = 0;
    let processed = 0;
    let xpAwards = 0;

    if (!state?.last_message_id) {
        const initialLimit = Math.min(
            100,
            Math.max(1, Number(config.StartupMessageScan.InitialMessagesPerChannel) || 100)
        );
        const messages = await channel.messages.fetch({ limit: initialLimit });
        rememberUsers(messages, channel.guild);
        initializeFromMessages(channel.id, channel.guild.id, messages);
        found = messages.size;
    } else if (state.last_message_id !== newestKnown) {
        const maxMessages = Math.max(
            100,
            Number(config.StartupMessageScan.MaxNewMessagesPerChannel) || 1000
        );
        let before;
        let reachedPreviousMessage = false;
        const messagesToProcess = [];

        while (!reachedPreviousMessage && found < maxMessages) {
            const batch = await channel.messages.fetch({
                limit: Math.min(100, maxMessages - found),
                ...(before ? { before } : {})
            });

            if (!batch.size) {
                break;
            }

            const newMessages = batch.filter((message) =>
                isAfter(message.id, state.last_message_id)
            );

            messagesToProcess.push(...newMessages.values());
            found += newMessages.size;
            reachedPreviousMessage = newMessages.size < batch.size || batch.size < 100;
            before = oldestMessageId(batch);
        }

        if (!reachedPreviousMessage && found >= maxMessages) {
            logger.warn(
                `Opstartscan bereikte de limiet van ${maxMessages} berichten in #${channel.name}.`
            );
        }

        const result = await processNewMessages(messagesToProcess, channel.guild);
        processed = result.processed;
        xpAwards = result.xpAwards;
    }

    const cachedNewest = newestMessageId(channel.messages.cache) || newestKnown;
    channelState.setChannelState(channel.id, channel.guild.id, cachedNewest);
    return { scanned: true, messages: found, processed, xpAwards };
}

async function scanStartupMessages(client) {
    let channelsScanned = 0;
    let messagesLoaded = 0;
    let messagesProcessed = 0;
    let xpAwards = 0;

    for (const guild of client.guilds.cache.values()) {
        await config.__context.run(guild.id, async () => {
            if (!config.StartupMessageScan?.Enabled) return;

            await guild.channels.fetch().catch((error) => {
                logger.warn(`Kanalen ophalen mislukt voor ${guild.name}: ${error.message}`);
            });

            if (typeof guild.channels.fetchActiveThreads === "function") {
                await guild.channels.fetchActiveThreads().catch((error) => {
                    logger.warn(`Actieve threads ophalen mislukt voor ${guild.name}: ${error.message}`);
                });
            }

            for (const channel of guild.channels.cache.values()) {
                try {
                    const result = await scanChannel(channel, client.user);
                    if (result.scanned) {
                        channelsScanned += 1;
                        messagesLoaded += result.messages;
                        messagesProcessed += result.processed;
                        xpAwards += result.xpAwards;
                    }
                } catch (error) {
                    logger.warn(
                        `Opstartscan overgeslagen voor ${channel.name || channel.id}: ${error.message}`
                    );
                }

                const delay = Math.max(0, Number(config.StartupMessageScan.DelayMs) || 0);
                if (delay) await wait(delay);
            }
        });
    }

    logger.startup(
        `Opstartscan voltooid: ${channelsScanned} kanalen, ` +
        `${messagesLoaded} berichten geladen, ${messagesProcessed} verwerkt.`
    );

    return { channelsScanned, messagesLoaded, messagesProcessed, xpAwards };
}

module.exports = {
    scanStartupMessages
};
