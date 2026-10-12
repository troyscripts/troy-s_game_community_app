const { tr, send } = require("../../utils/localization");
const { SlashCommandBuilder, MessageFlags, escapeMarkdown } = require('discord.js');
const actions=require('../../database/economyActions');
const config=require('../../config/config');
const label={open:'Open',paid:tr("Betaald"),declined:tr("Geweigerd"),cancelled:tr("Geannuleerd")};
const idOption=o=>o.setName('nummer').setDescription("Het rekeningnummer uit je overzicht").setMinValue(1).setRequired(true);
module.exports={
    data:new SlashCommandBuilder().setName('rekening').setDescription('Verstuur en beheer rekeningen voor spelgeld.')
        .addSubcommand(s=>s.setName('sturen').setDescription('Stuur een betaalverzoek; er wordt nog geen geld afgeschreven.')
            .addUserOption(o=>o.setName('gebruiker').setDescription('Ontvanger').setRequired(true))
            .addIntegerOption(o=>o.setName('bedrag').setDescription('Bedrag in spelgeld').setMinValue(1).setMaxValue(1000000).setRequired(true))
            .addStringOption(o=>o.setName('omschrijving').setDescription('Waarvoor is de rekening?').setMinLength(1).setMaxLength(200).setRequired(true)))
        .addSubcommand(s=>s.setName('overzicht').setDescription('Bekijk je ontvangen of verstuurde rekeningen.')
            .addStringOption(o=>o.setName('richting').setDescription('Welke rekeningen?').addChoices({name:'Ontvangen',value:'received'},{name:'Verstuurd',value:'sent'}))
            .addIntegerOption(o=>o.setName('pagina').setDescription('10 rekeningen per pagina').setMinValue(1).setMaxValue(100000)))
        .addSubcommand(s=>s.setName('bekijken').setDescription('Bekijk de details van een rekening.').addIntegerOption(idOption))
        .addSubcommand(s=>s.setName('betalen').setDescription('Betaal een ontvangen rekening met je spelgeld.').addIntegerOption(idOption)
            .addStringOption(o=>o.setName('van').setDescription('Betaalmiddel; standaard bank').addChoices({name:'Bank',value:'bank'},{name:'Portemonnee',value:'wallet'})))
        .addSubcommand(s=>s.setName('weigeren').setDescription('Weiger een ontvangen rekening.').addIntegerOption(idOption))
        .addSubcommand(s=>s.setName('annuleren').setDescription('Annuleer een rekening die je zelf verstuurd hebt.').addIntegerOption(idOption)),
    category:'Economy',guildOnly:true,cooldown:2,
    async execute(_client,i){
        const sub=i.options.getSubcommand();
        await i.deferReply(sub==='sturen'?{}:{flags:MessageFlags.Ephemeral});
        const reply=content=>send(i, "editReply", {content,allowedMentions:{parse:[]}});
        try{
            if(!config.Economy.Enabled) throw new Error(tr("De economie staat uit in deze server."));
            const guild=i.guild.id,user=i.user.id;
            if(sub==='sturen'){
                const target=i.options.getUser('gebruiker',true);
                if(target.bot) throw new Error(tr("Je kunt geen rekening aan een bot sturen."));
                if(!await i.guild.members.fetch(target.id).catch(()=>null)) throw new Error(tr("Deze speler zit niet in deze server."));
                const amount=i.options.getInteger('bedrag',true);
                const id=actions.createInvoice(user,target.id,guild,amount,i.options.getString('omschrijving',true),i.id);
                return reply(tr("🧾 Rekening **#{0}** van <@{1}> voor <@{2}>: **€{3} spelgeld**.\nDe ontvanger vindt deze bij `/rekening overzicht` en kan betalen of weigeren. Er is nog niets afgeschreven.", id, user, target.id, amount));
            }
            if(sub==='overzicht'){
                const direction=i.options.getString('richting')||'received',page=i.options.getInteger('pagina')||1;
                const rows=actions.listInvoices(guild,user,direction,page);
                return reply(tr("🧾 **{0} rekeningen — pagina {1}**\n", direction==='sent'?tr("Verstuurde"):tr("Ontvangen"), page)+
                    (rows.length?rows.map(r=>`**#${r.id}** · €${r.amount} · ${label[r.status]} · <@${direction==='sent'?r.recipient_id:r.sender_id}>`).join('\n'):tr("Geen rekeningen op deze pagina."))+
                    tr("\nGebruik `/rekening bekijken` voor de omschrijving; kies een volgende pagina voor oudere rekeningen."));
            }
            const id=i.options.getInteger('nummer',true);
            if(sub==='bekijken'){
                const r=actions.getInvoice(guild,id,user);
                return reply(tr("🧾 **Rekening #{0} — {1}**\nVan: <@{2}>\nAan: <@{3}>\nBedrag: €{4} spelgeld\nOmschrijving: {5}\nAangemaakt: <t:{6}:f>", r.id, label[r.status], r.sender_id, r.recipient_id, r.amount, escapeMarkdown(r.reason), Math.floor(r.created_at/1000)));
            }
            const state={betalen:'paid',weigeren:'declined',annuleren:'cancelled'}[sub];
            const r=actions.settleInvoice(guild,id,user,state,i.options.getString('van')||'bank');
            return reply(tr("✅ Rekening **#{0}**: **{1}**.{2}", r.id, label[r.status], state==='paid'?tr(" €{0} spelgeld overgemaakt.", r.amount):''));
        }catch(error){return reply(`❌ ${error.message}`);}
    }
};
