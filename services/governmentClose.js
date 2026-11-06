const { PermissionFlagsBits: P } = require('discord.js');
const config = require('../config/config');
const transcripts = require('./boundedTranscript');
const { display } = require('./governmentLabels');
const store = require('../database/governmentTickets');

async function closeTicket(interaction, ticket) {
 const channel = interaction.channel;
 const id = config.Tickets.LogChannel;
 if (!id || id === channel.id) {
  throw new Error('Tickets.LogChannel ontbreekt of verwijst naar dit ticket. Stel het ticketlogkanaal in; het ticket blijft behouden.');
 }
 const log = await interaction.guild.channels.fetch(id, { force: true });
 if (!log?.isTextBased() || log.guildId !== interaction.guildId || typeof log.send !== 'function') {
  throw new Error('Het ingestelde ticketlogkanaal is niet beschikbaar op deze server. Het ticket blijft behouden.');
 }
 const me = await interaction.guild.members.fetchMe();
 if (!log.permissionsFor(me)?.has([P.ViewChannel, P.SendMessages, P.AttachFiles])) {
  throw new Error('De bot kan geen transcript bijvoegen in Tickets.LogChannel. Controleer de kanaalrechten; het ticket blijft behouden.');
 }
 if (!channel.permissionsFor(me)?.has([P.ViewChannel, P.ReadMessageHistory, P.ManageChannels])) {
  throw new Error('De bot mist rechten om het ticket te lezen of te verwijderen. Het ticket blijft behouden.');
 }
 const roles = await interaction.guild.roles.fetch();
 const settings = store.get(interaction.guildId, ticket.service, ticket.department);
 const label = display(ticket.service, ticket.department, settings, roles).label;
 const file = await transcripts.createTranscript(channel, { filename: `overheid-${channel.id}-${Date.now()}.html` });
 // Only delete after Discord acknowledges the transcript upload. On retry, export
 // again so any messages written since an unsuccessful deletion are also retained.
 await log.send({
  content: `📄 **Overheidsticket — ${ticket.service} / ${label}**\nTicket: ${channel.name} (${channel.id})\nAanvrager: <@${ticket.owner}>\nGesloten door: <@${interaction.user.id}>\nBehandelaar: ${ticket.claimed ? `<@${ticket.claimed}>` : 'niet geclaimd'}`,
  files: [file], allowedMentions: { parse: [] }
 });
 await channel.delete(`Overheidsticket gesloten door ${interaction.user.id}; transcript in ${id}`);
 store.deleted(interaction.guildId, channel.id);
}
module.exports = { closeTicket };
