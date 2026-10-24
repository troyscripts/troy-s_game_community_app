"use strict";
const { SlashCommandBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('leave').setDescription('Stop de radio en haal de bot uit het spraakkanaal').setDMPermission(false),
    category: 'Community', guildOnly: true, dmAllowed: false, cooldown: 3,
    execute(client, interaction) {
        return require('./radio').run(client, interaction, { sub: 'stop' });
    }
};
