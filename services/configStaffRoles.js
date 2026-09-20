const { ActionRowBuilder, RoleSelectMenuBuilder, MessageFlags } = require('discord.js');
const settings = require('../database/guildSettings');
const { hasOwnerAccess } = require('../utils/permissions');
function isAllowed(interaction) {
    return Boolean(interaction.guild && hasOwnerAccess(interaction.member, interaction.user.id));
}
async function deny(interaction) {
    return interaction.reply({ content: '❌ Alleen de owner of een ingestelde developer van deze Discord-server kan de staffrollen instellen.', flags: MessageFlags.Ephemeral });
}
async function open(interaction) {
    if (!isAllowed(interaction)) return deny(interaction);
    if (settings.usesDefaults(interaction.guild.id)) {
        return interaction.reply({ content: 'Deze server gebruikt config/defaults.js. Wijzig StaffRoles in dat bestand en herstart de bot.', flags: MessageFlags.Ephemeral });
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const roles = await interaction.guild.roles.fetch();
    const current = settings.exportGuild(interaction.guild.id).StaffRoles || [];
    if (current.length > 25) return interaction.editReply({ content: 'Je hebt meer dan 25 staffrollen ingesteld. Gebruik de waarde-optie om deze lijst te bewerken; het keuzemenu kan maximaal 25 rollen opslaan.' });
    const valid = current.filter(id => roles.has(id) && id !== interaction.guild.id && !roles.get(id).managed);
    const menu = new RoleSelectMenuBuilder().setCustomId(`config_staff_roles:${interaction.user.id}`)
        .setPlaceholder('Klik de staffrollen aan').setMinValues(0).setMaxValues(25);
    if (valid.length) menu.setDefaultRoles(...valid);
    return interaction.editReply({
        content: '**Staffrollen instellen**\nKlik alle gewenste staffrollen aan (maximaal 25). Je bevestigde selectie vervangt de hele StaffRoles-lijst en wordt direct opgeslagen voor deze server. Deselecteer alles om de lijst leeg te maken.\n\n' +
            `Huidig: ${current.length ? current.map(id=>`<@&${id}>`).join(', ') : 'geen staffrollen'}`,
        components: [new ActionRowBuilder().addComponents(menu)], allowedMentions: { parse: [] }
    });
}
async function execute(_client, interaction) {
    if (!isAllowed(interaction) || interaction.customId.split(':')[1] !== interaction.user.id) return deny(interaction);
    await interaction.deferUpdate();
    try {
        const ids = [...new Set(interaction.values)];
        if (ids.length > 25) throw new Error('Kies maximaal 25 rollen.');
        const roles = await interaction.guild.roles.fetch();
        for (const id of ids) {
            const role = roles.get(id);
            if (!role || id === interaction.guild.id || role.managed) throw new Error('Kies bestaande rollen voor staffleden; @everyone en beheerde botrollen zijn niet toegestaan.');
        }
        settings.updateValue(interaction.guild.id, 'StaffRoles', JSON.stringify(ids));
        return await interaction.editReply({
            content: `✅ **StaffRoles** is opgeslagen voor deze server.\n${ids.length ? ids.map(id=>`• <@&${id}>`).join('\n') : 'De lijst met staffrollen is leeggemaakt.'}`,
            components: [], allowedMentions: { parse: [] }
        });
    } catch (error) {
        return interaction.followUp({ content: `❌ ${error.message}`, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
    }
}
module.exports = { open, execute };
