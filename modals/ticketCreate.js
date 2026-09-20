const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    escapeMarkdown
} = require("discord.js");

const config = require("../config/config");
const tickets = require("../database/tickets");
const logger = require("../utils/logger");
const panels = require("../database/ticketPanels");
const creating = new Set();
const { createStaffThread } = require("../services/ticketDiscussion");
const { selectStaffRoles } = require("../services/ticketStaff");

function safeChannelName(username) {
    const clean = username
        .normalize("NFKD")
        .replace(/[^a-zA-Z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase()
        .slice(0, 24);

    return clean || "gebruiker";
}

module.exports = {
    customId: "ticket_create",

    async execute(client, interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const key = `${interaction.guild.id}:${interaction.user.id}`;
        if (creating.has(key)) return interaction.editReply({ content: "⏳ Je ticket wordt al aangemaakt." });
        creating.add(key);
        try {
        if (!config.Tickets.Enabled) return interaction.editReply({ content: "❌ Het ticketsysteem is momenteel uitgeschakeld." });
        const parts = interaction.customId.split(":");
        const panelId = parts.length === 3 ? parts[1] : undefined;
        const value = parts.length === 3 ? parts[2] : (parts[1] || "support");
        let category;
        try { category = panels.resolve(interaction.guild.id, panelId, value); }
        catch (error) { return interaction.editReply({ content: `❌ ${error.message}`, allowedMentions: { parse: [] } }); }
        const reason = interaction.fields.getTextInputValue("ticket_reason").trim();
        if (reason.length < 10 || reason.length > 1000) return interaction.editReply({ content: "❌ Gebruik 10 tot 1000 tekens voor je vraag." });
        if (tickets.getOpenTicketCount(interaction.user.id, interaction.guild.id) >= config.Tickets.MaxOpenPerUser) {
            const existing = tickets.getOpenTicket(interaction.user.id, interaction.guild.id);
            return interaction.editReply({ content: existing ? `❌ Je hebt het maximum van ${config.Tickets.MaxOpenPerUser} open tickets bereikt. Een van je tickets: <#${existing.channel_id}>` : "❌ Je hebt het maximale aantal open tickets bereikt." });
        }

        const botMember = interaction.guild.members.me;
        let staffRoles;
        try {
            await interaction.guild.roles.fetch();
            const minimumRole = panels.getMinimumRole(interaction.guild.id, panelId, value);
            staffRoles = selectStaffRoles(interaction.guild, config.StaffRoles, minimumRole);
        } catch (error) {
            return interaction.editReply({ content: `❌ ${error.message}`, allowedMentions: { parse: [] } });
        }

        const accessRoles = [...new Set([...staffRoles, config.Roles?.Owner, config.Roles?.Developer])]
            .filter(id => id && id !== interaction.guild.id && interaction.guild.roles.cache.has(id));
        const permissionOverwrites = [
            {
                id: interaction.guild.roles.everyone.id,
                deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageThreads, PermissionFlagsBits.CreatePrivateThreads, PermissionFlagsBits.CreatePublicThreads]
            },
            {
                id: interaction.user.id,
                deny: [PermissionFlagsBits.ManageThreads, PermissionFlagsBits.CreatePrivateThreads, PermissionFlagsBits.CreatePublicThreads],
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.AttachFiles,
                    PermissionFlagsBits.EmbedLinks
                ]
            },
            {
                id: botMember.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.ManageChannels,
                    PermissionFlagsBits.ManageMessages,
                    PermissionFlagsBits.CreatePrivateThreads,
                    PermissionFlagsBits.ManageThreads,
                    PermissionFlagsBits.SendMessagesInThreads
                ]
            },
            ...accessRoles.map((roleId) => ({
                id: roleId,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.SendMessagesInThreads
                ]
            }))
        ];

        const parentId = panels.getParentCategory(interaction.guild.id, panelId, value) || config.Tickets.Category;
        const parentChannel = parentId ? await interaction.guild.channels.fetch(parentId).catch(() => null) : null;
        if (parentId && parentChannel?.type !== ChannelType.GuildCategory) {
            return interaction.editReply({ content: "❌ De ingestelde Discord-categorie ontbreekt. Laat staff het paneel of Tickets.Category aanpassen." });
        }
        const parent = parentChannel?.id;

        let channel;

        try {
            channel = await interaction.guild.channels.create({
                name: `ticket-${safeChannelName(interaction.user.username)}`,
                type: ChannelType.GuildText,
                parent,
                topic: `Ticket van ${interaction.user.tag} (${interaction.user.id}) | ${category}`,
                permissionOverwrites,
                reason: `Ticket geopend door ${interaction.user.tag}`
            });

            const ticketNumber = tickets.createTicket({
                guildId: interaction.guild.id,
                userId: interaction.user.id,
                channelId: channel.id,
                category
            });
            await channel.setName(`ticket-${ticketNumber}-${safeChannelName(category)}-${safeChannelName(interaction.user.username)}`);
            const thread = await createStaffThread(channel);
            tickets.setStaffThread(channel.id, thread.id, staffRoles);
        } catch (error) {
            if (channel) {
                tickets.deleteTicket(channel.id);
                await channel.delete("Ticketaanmaak teruggedraaid na databasefout").catch(() => {});
            }
            throw error;
        }

        const embed = new EmbedBuilder()
            .setColor(config.Bot.Color)
            .setTitle("🎫 Nieuw supportticket")
            .setDescription(
                `Welkom ${interaction.user}! Een medewerker helpt je zo snel mogelijk.\n\n` +
                `**Categorie:** ${escapeMarkdown(category)}\n` +
                `**Reden:** ${reason}`
            )
            .setFooter({ text: config.Bot.Footer })
            .setTimestamp();

        const controls = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("ticket-discuss").setLabel("Staffoverleg").setEmoji("💬").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("ticket-claim")
                .setLabel("Claim")
                .setEmoji("🙋")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId("ticket-close")
                .setLabel("Sluiten")
                .setEmoji("🔒")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId("ticket-transcript")
                .setLabel("Transcript")
                .setEmoji("📄")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("ticket-delete")
                .setLabel("Verwijderen")
                .setEmoji("🗑️")
                .setStyle(ButtonStyle.Danger)
        );

        await channel.send({
            content: `${interaction.user} ${staffRoles.map((id) => `<@&${id}>`).join(" ")}`.trim(),
            embeds: [embed],
            components: [controls],
            allowedMentions: {
                users: [interaction.user.id],
                roles: staffRoles
            }
        });

        const logChannel = interaction.guild.channels.cache.get(config.Tickets.LogChannel);
        if (logChannel?.isTextBased?.()) {
            await logChannel.send({
                content: `🎫 Ticket ${channel} geopend door ${interaction.user} (${escapeMarkdown(category)}).`,
                allowedMentions: { parse: [] }
            }).catch(() => {});
        }

        logger.event(`Ticket ${channel.name} geopend door ${interaction.user.tag}.`);
        return interaction.editReply({
            content: `✅ Je ticket is aangemaakt: ${channel}`
        });
        } finally { creating.delete(key); }
    }
};
