const { SlashCommandBuilder } = require('discord.js');
const { PRODUCTS } = require('../../database/living');
module.exports={
    data:new SlashCommandBuilder().setName('supermarkt').setDescription('Koop eten en drinken of gebruik producten uit je blijvende voorraad.')
        .addStringOption(o=>o.setName('actie').setDescription('Wat wil je doen?').addChoices(
            {name:'Aanbod',value:'aanbod'},{name:'Mijn voorraad',value:'voorraad'},{name:'Kopen',value:'kopen'},{name:'Eten / drinken',value:'gebruiken'}))
        .addStringOption(o=>o.setName('product').setDescription('Kies eten of drinken.').addChoices(...Object.entries(PRODUCTS).map(([value,p])=>({name:`${p.name} — €${p.price}`,value}))))
        .addIntegerOption(o=>o.setName('aantal').setDescription('Aantal producten (standaard 1).').setMinValue(1).setMaxValue(100))
        .addStringOption(o=>o.setName('betaalmiddel').setDescription('Betaal met portemonnee of bank.').addChoices({name:'Portemonnee',value:'wallet'},{name:'Bank',value:'bank'}))
        .addBooleanOption(o=>o.setName('bevestigen').setDescription('Bevestig de aankoop of het gebruik van je producten.')),
    category:'Economy',guildOnly:true,cooldown:3,execute:require('../../services/living').supermarket
};
