const { SlashCommandBuilder } = require('discord.js');
const giveaways = require('../../services/giveaways');
const id = o => o.setName('id').setDescription('Het Giveaway-ID onder het giveawaybericht.').setMinValue(1).setRequired(true);
module.exports = {
    data: new SlashCommandBuilder().setName('giveaway').setDescription('Start of beheer een giveaway.')
        .addSubcommand(s => s.setName('start').setDescription('Staff: start een giveaway met één of meerdere prijzen.')
            .addStringOption(o => o.setName('titel').setDescription('Titel van de giveaway.').setMaxLength(150).setRequired(true))
            .addStringOption(o => o.setName('tekst').setDescription('Uitleg bij de giveaway.').setMaxLength(1500).setRequired(true))
            .addStringOption(o => o.setName('einddatum').setDescription('DD-MM-JJJJ UU:MM, Nederlandse tijd, maximaal twee maanden vooruit.').setRequired(true))
            .addStringOption(o => o.setName('prijzen').setDescription('1–10 prijzen gescheiden door |. Eén unieke winnaar per prijs.').setMaxLength(827).setRequired(true)))
        .addSubcommand(s => s.setName('stoppen').setDescription('Staff: sluit vroegtijdig en trek direct de winnaars.').addIntegerOption(id))
        .addSubcommand(s => s.setName('annuleren').setDescription('Staff: verwijder een open giveaway zonder winnaars te trekken.').addIntegerOption(id)),
    category: 'Fun', guildOnly: true, cooldown: 3, execute: giveaways.command
};
