const { randomUUID } = require('node:crypto');
const { ActionRowBuilder, StringSelectMenuBuilder, ChannelSelectMenuBuilder, ChannelType, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const config = require('../config/config');
const panels = require('../database/ticketPanels');
const { selectStaffRoles } = require('./ticketStaff');
const { hasPermission } = require('../utils/permissions');
const drafts = new Map();
function createDraft(interaction, labels, roles) {
    for (const [id, d] of drafts) if (d.expires < Date.now()) drafts.delete(id);
    const draft = { id: randomUUID(), userId: interaction.user.id, guildId: interaction.guild.id, channelId: interaction.channel.id,
        labels, roles, parents: labels.map(() => null), index: 0, expires: Date.now() + 15*60*1000, busy: false };
    drafts.set(draft.id, draft);
    return draft;
}
function render(d) {
    return {
        content: '**Kies voor elk ticketonderwerp de Discord-categorie.**\nSelecteer bovenaan een onderwerp en daaronder de bestemming. Plaats daarna het paneel. Dit instelscherm verloopt na 15 minuten.\n\n' +
            d.labels.map((label,i) => `${i === d.index ? '➡️' : '•'} ${label}: ${d.parents[i] ? `<#${d.parents[i]}>` : 'nog kiezen'}`).join('\n'),
        components: [
            new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`ticket_setup_topic:${d.id}`).setPlaceholder('Ticketonderwerp')
                .addOptions(d.labels.map((label,i) => ({ label, value:String(i), default:i===d.index })))),
            new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId(`ticket_setup_target:${d.id}:${d.index}`)
                .setPlaceholder(`Bestemming voor ${d.labels[d.index]}`.slice(0,150)).setChannelTypes(ChannelType.GuildCategory).setMinValues(1).setMaxValues(1)),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`ticket_setup_publish:${d.id}`).setLabel('Paneel plaatsen').setStyle(ButtonStyle.Success).setDisabled(d.parents.some(p=>!p)),
                new ButtonBuilder().setCustomId(`ticket_setup_cancel:${d.id}`).setLabel('Annuleren').setStyle(ButtonStyle.Secondary))
        ], allowedMentions:{parse:[]}
    };
}
async function execute(_client, interaction) {
    const [action,id,indexText] = interaction.customId.split(':');
    const d = drafts.get(id);
    if (!d || d.expires < Date.now()) {
        if (d) drafts.delete(id);
        return interaction.reply({content:'❌ Deze instelling is verlopen. Start /ticket-panel opnieuw.',flags:MessageFlags.Ephemeral});
    }
    if (d.userId !== interaction.user.id || d.guildId !== interaction.guild.id || d.channelId !== interaction.channel.id || !hasPermission(interaction.member, ['ManageChannels'])) {
        return interaction.reply({content:'❌ Alleen de maker met Kanalen beheren kan dit paneel instellen.',flags:MessageFlags.Ephemeral});
    }
    if (d.busy) return interaction.reply({content:'⏳ Het paneel wordt verwerkt.',flags:MessageFlags.Ephemeral});
    d.busy = true;
    try {
        await interaction.deferUpdate();
        if (action === 'ticket_setup_cancel') {
            drafts.delete(id);
            return await interaction.editReply({content:'Paneel geannuleerd.',components:[]});
        }
        if (action === 'ticket_setup_topic') {
            const index = Number(interaction.values[0]);
            if (!Number.isInteger(index) || index < 0 || index >= d.labels.length) throw new Error('Ongeldig onderwerp.');
            d.index = index;
        } else if (action === 'ticket_setup_target') {
            const index = Number(indexText);
            if (!Number.isInteger(index) || index < 0 || index >= d.labels.length) throw new Error('Ongeldig onderwerp.');
            const target = await interaction.guild.channels.fetch(interaction.values[0]);
            if (target?.type !== ChannelType.GuildCategory || target.guild.id !== d.guildId) throw new Error('Kies een Discord-categorie op deze server.');
            d.parents[index] = target.id;
        } else if (action === 'ticket_setup_publish') {
            if (d.parents.some(p=>!p)) throw new Error('Kies eerst voor elk onderwerp een bestemming.');
            for (const parent of new Set(d.parents)) {
                const target = await interaction.guild.channels.fetch(parent);
                if (target?.type !== ChannelType.GuildCategory || target.guild.id !== d.guildId) throw new Error('Een doelcategorie bestaat niet meer. Kies een andere bestemming.');
            }
            await interaction.guild.roles.fetch();
            for (const role of d.roles) if (role) selectStaffRoles(interaction.guild,config.StaffRoles,role);
            const panelId = panels.create(d.guildId,d.userId,d.labels,d.roles,null,d.parents);
            try {
                await interaction.channel.send({
                    embeds:[new EmbedBuilder().setColor(config.Bot.Color).setTitle('🎫 Support Tickets')
                        .setDescription('Heb je hulp nodig?\n\nKlik op **Open ticket**, kies het onderwerp en beschrijf je vraag. Een medewerker helpt je zo snel mogelijk.').setFooter({text:config.Bot.Footer})],
                    components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`ticket_open:${panelId}`).setLabel('Open ticket').setEmoji('🎫').setStyle(ButtonStyle.Primary))],
                    allowedMentions:{parse:[]}
                });
            } catch(error) { panels.remove(d.guildId,panelId); throw error; }
            drafts.delete(id);
            return await interaction.editReply({content:'✅ Paneel geplaatst.\n'+d.labels.map((label,i)=>`• ${label} → <#${d.parents[i]}>`).join('\n')+(config.Tickets.Enabled?'':'\nℹ️ Zet Tickets.Enabled aan via /config.'),components:[],allowedMentions:{parse:[]}});
        }
        return await interaction.editReply(render(d));
    } catch(error) {
        return interaction.followUp({content:`❌ ${error.message}`,flags:MessageFlags.Ephemeral,allowedMentions:{parse:[]}});
    } finally { d.busy = false; }
}
module.exports = { createDraft, render, execute };
