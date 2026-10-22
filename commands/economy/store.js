const { SlashCommandBuilder } = require('discord.js');
module.exports={
    data:new SlashCommandBuilder().setName('store').setDescription('Koop VIP of verplichte rekeningen met spelgeld en bekijk je aankopen.')
        .addStringOption(o=>o.setName('actie').setDescription('Wat wil je bekijken?').addChoices({name:'Winkel',value:'winkel'},{name:'Mijn aankopen',value:'status'},{name:'Aankoopgeschiedenis',value:'geschiedenis'}))
        .addStringOption(o=>o.setName('betaalmiddel').setDescription('Betaal met je portemonnee of bank; standaard portemonnee.').addChoices({name:'Portemonnee',value:'wallet'},{name:'Bank',value:'bank'})),
    category:'Economy',guildOnly:true,cooldown:3,execute:require('../../services/store').command
};
