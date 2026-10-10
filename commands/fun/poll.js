const { SlashCommandBuilder } = require('discord.js');
const polls = require('../../services/polls');
const question = (o, required = false) => o.setName('vraag').setDescription('De vraag voor de poll.').setMaxLength(500).setRequired(required);
const answers = (o, required = false) => o.setName('antwoorden').setDescription('2–10 antwoorden, gescheiden door |. Wijzigen wist de stemmen.').setMaxLength(827).setRequired(required);
const duration = (o, required = false) => o.setName('minuten').setDescription('Resterende looptijd vanaf nu: 1 tot 43200 minuten (30 dagen).').setMinValue(1).setMaxValue(43200).setRequired(required);
const id = o => o.setName('id').setDescription('Het Poll-ID onder het pollbericht.').setMinValue(1).setRequired(true);
module.exports = {
    data: new SlashCommandBuilder().setName('poll').setDescription('Maak een poll of beheer een poll als staff.')
        .addSubcommand(s => s.setName('maken').setDescription('Maak een poll met antwoorden en een timer.')
            .addStringOption(o => question(o, true)).addStringOption(o => answers(o, true))
            .addIntegerOption(o => duration(o, true))
            .addBooleanOption(o => o.setName('meerdere').setDescription('Mogen leden meerdere antwoorden kiezen? Standaard: nee.')))
        .addSubcommand(s => s.setName('wijzigen').setDescription('Staff: wijzig vraag, antwoorden of timer; inhoud wijzigen wist stemmen.')
            .addIntegerOption(id).addStringOption(o => question(o)).addStringOption(o => answers(o)).addIntegerOption(o => duration(o)))
        .addSubcommand(s => s.setName('stoppen').setDescription('Staff: sluit de poll direct en bewaar de uitslag.').addIntegerOption(id))
        .addSubcommand(s => s.setName('annuleren').setDescription('Staff: verklaar de poll ongeldig en wis alle stemmen.').addIntegerOption(id)),
    category: 'Fun', guildOnly: true, cooldown: 3,
    execute: polls.command
};
