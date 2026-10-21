const {SlashCommandBuilder}=require('discord.js');
module.exports={data:new SlashCommandBuilder().setName('ticket-claim').setDescription('Claim dit ticket of neem het over als hogere staff.'),category:'Tickets',staffOnly:true,guildOnly:true,execute:require('../../services/ticketAccess').claim};
