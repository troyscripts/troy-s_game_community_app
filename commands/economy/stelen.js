const { tr, send } = require("../../utils/localization");
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
            if(target.bot) throw new Error(tr("Je kunt niet van een bot stelen."));
            const member=await i.guild.members.fetch(target.id).catch(()=>null);
            if(!member) throw new Error(tr("Deze speler zit niet in deze server."));
            const result=actions.steal(i.user.id,target.id,i.guild.id,i.id);
            await send(i, "editReply", {content:result.success
                ? tr("🦹 <@{0}> heeft €{1} spelgeld gestolen uit de portemonnee van <@{2}>!", i.user.id, result.amount, target.id)
                : tr("🚨 Steelpoging mislukt! <@{0}> betaalt €{1} spelgeld schadevergoeding aan <@{2}>.", i.user.id, result.amount, target.id),allowedMentions:{parse:[]}});
        } catch(error) {
            await send(i, "editReply", {content:`❌ ${error.message}`,allowedMentions:{parse:[]}});
        }
    }
};
