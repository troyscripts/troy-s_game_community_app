const {SlashCommandBuilder}=require('discord.js');
module.exports={
    data:new SlashCommandBuilder().setName('ticket-add').setDescription('Voeg een gebruiker of rol toe aan dit ticket.')
        .addUserOption(o=>o.setName('gebruiker').setDescription('Kies een gebruiker; laat rol leeg.'))
        .addRoleOption(o=>o.setName('rol').setDescription('Kies een rol; laat gebruiker leeg.')),
    category:'Tickets',staffOnly:true,guildOnly:true,
    execute:(_client,i)=>require('../../services/ticketAccess').change(i,false)
};
