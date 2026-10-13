const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const languages=require('../../database/languages');
module.exports={
 data:new SlashCommandBuilder().setName('language').setDescription('Kies de taal voor je persoonlijke botantwoorden.')
 .setDescriptionLocalizations({'en-US':'Choose the language for your private bot replies.','en-GB':'Choose the language for your private bot replies.'})
 .addStringOption(o=>o.setName('taal').setNameLocalizations({'en-US':'language','en-GB':'language'})
 .setDescription('Nederlands of Engels').setDescriptionLocalizations({'en-US':'Dutch or English','en-GB':'Dutch or English'})
 .setRequired(true).addChoices({name:'Nederlands',value:'nl'},{name:'English',value:'en'})),
 category:'Algemeen',cooldown:3,
 async execute(client,i){const language=i.options.getString('taal');languages.set(i.guildId,i.user.id,language);
 return i.reply({content:language==='en'?'✅ Your private replies are now in English. Public messages follow the server language setting.':'✅ Je privéantwoorden zijn nu Nederlands. Openbare berichten volgen de taalinstelling van de server.',flags:MessageFlags.Ephemeral});}
};
