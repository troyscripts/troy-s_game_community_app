const { ChannelType, PermissionFlagsBits } = require('discord.js');
const tickets = require('../database/tickets');
const config = require('../config/config');
const { hasOwnerAccess } = require('../utils/permissions');

async function createStaffThread(channel) {
    const thread = await channel.threads.create({
        name: `staff-${channel.name}`.slice(0, 100), type: ChannelType.PrivateThread,
        invitable: false, autoArchiveDuration: 1440, reason: 'Privéoverleg voor ticketstaff'
    });
    await thread.send({ content: '💬 Bespreek dit ticket hier met staff. Dit overleg wordt niet opgenomen in het transcript voor de ticketmaker.', allowedMentions: { parse: [] } });
    return thread;
}
function canDiscuss(ticket, member, channel) {
    if (!member || member.user?.bot) return false;
    if (!channel.permissionsFor(member)?.has(PermissionFlagsBits.ViewChannel)) return false;
    // Owners/admins can test and manage their own tickets. Regular ticket makers
    // remain excluded even when they hold another staff role.
    if (hasOwnerAccess(member, member.id) || member.permissions.has(PermissionFlagsBits.Administrator)) return true;
    if (member.id === ticket.user_id) return false;
    const roles = ticket.staff_roles_json ? JSON.parse(ticket.staff_roles_json) : config.StaffRoles;
    return roles.some(id => member.roles.cache.has(id));
}
async function getStaffThread(channel, ticket) {
    if (ticket.staff_thread_id) {
        const thread = await channel.guild.channels.fetch(ticket.staff_thread_id).catch(error => {
            if (error.code === 10003) return null;
            throw error;
        });
        if (thread) {
            if (thread.type !== ChannelType.PrivateThread || thread.parentId !== channel.id) throw new Error('Ongeldige staffthread.');
            return thread;
        }
    }
    const thread = await createStaffThread(channel);
    tickets.setStaffThread(channel.id, thread.id, ticket.staff_roles_json ? JSON.parse(ticket.staff_roles_json) : config.StaffRoles);
    return thread;
}
module.exports = { createStaffThread, canDiscuss, getStaffThread };
