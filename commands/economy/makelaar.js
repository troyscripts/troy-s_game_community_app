const { SlashCommandBuilder } = require('discord.js');
module.exports={
    data:new SlashCommandBuilder().setName('makelaar').setDescription('Bekijk, koop of huur een woning met extra XP en inkomen.')
        .addStringOption(o=>o.setName('actie').setDescription('Bekijk het aanbod, je woning of wijzig je woning.').addChoices(
            {name:'Aanbod',value:'aanbod'},{name:'Mijn woning',value:'status'},{name:'Kopen',value:'kopen'},{name:'Huren',value:'huren'},{name:'Huur opzeggen',value:'opzeggen'},{name:'Woning verkopen (75%)',value:'verkopen'}))
        .addStringOption(o=>o.setName('woning').setDescription('Welke woning?').addChoices(
            {name:'Starterwoning — €15.000 / €500 per dag',value:'starter'},
            {name:'Luxe woning — €75.000 / €2.000 per dag',value:'luxe'},
            {name:'Luxe villa — €250.000 / €7.500 per dag',value:'villa'}))
        .addStringOption(o=>o.setName('betaalmiddel').setDescription('Eerste betaling; vervolghuur gaat altijd via de bank.').addChoices({name:'Portemonnee',value:'wallet'},{name:'Bank',value:'bank'}))
        .addBooleanOption(o=>o.setName('bevestigen').setDescription('Ja: accepteer de prijs, verkoop van je oude woning en eventuele doorlopende huur.')),
    category:'Economy',guildOnly:true,cooldown:3,execute:require('../../services/living').realtor
};
