const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const actions = require('../../database/economyActions');
module.exports = {
    data: new SlashCommandBuilder().setName('stelen').setDescription('Probeer spelgeld uit iemands portemonnee te stelen; bij mislukken betaal je €100.')
        .addUserOption(o=>o.setName('gebruiker').setDescription('Van wie wil je proberen te stelen?').setRequired(true)),
    category:'Economy',guildOnly:true,cooldown:3,
    async execute(_client,i) {
        await i.deferReply();
        try {
            const target=i.options.getUser('gebruiker',true);
            if(target.bot) throw new Error('Je kunt niet van een bot stelen.');
            const member=await i.guild.members.fetch(target.id).catch(()=>null);
            if(!member) throw new Error('Deze speler zit niet in deze server.');
            const result=actions.steal(i.user.id,target.id,i.guild.id,i.id);
            await i.editReply({content:result.success
                ? `🦹 <@${i.user.id}> heeft €${result.amount} spelgeld gestolen uit de portemonnee van <@${target.id}>!`
                : `🚨 Steelpoging mislukt! <@${i.user.id}> betaalt €${result.amount} spelgeld schadevergoeding aan <@${target.id}>.`,allowedMentions:{parse:[]}});
        } catch(error) {
            await i.editReply({content:`❌ ${error.message}`,allowedMentions:{parse:[]}});
        }
    }
};
