"use strict";
const { SlashCommandBuilder, MessageFlags, ChannelType, PermissionFlagsBits } = require('discord.js');
const { tr, send } = require('../../utils/localization');
const config = require('../../config/config');
const { hasOwnerAccess } = require('../../utils/permissions');
const radio = require('../../services/radioService');
const slot = o => o.setName('zender').setDescription('Zendernummer uit /radio lijst').setRequired(true).setMinValue(1).setMaxValue(25);
const data = new SlashCommandBuilder().setName('radio').setDescription('Luister samen naar internetradio').setDMPermission(false)
    .addSubcommand(s => s.setName('paneel').setDescription('Plaats het radiopaneel met zenderkeuze in deze callchat'))
    .addSubcommand(s => s.setName('start').setDescription('Start of wissel de radio in jouw spraakkanaal').addIntegerOption(slot))
    .addSubcommand(s => s.setName('stop').setDescription('Stop de radio en verlaat het spraakkanaal'))
    .addSubcommand(s => s.setName('volume').setDescription('Pas het radiovolume aan').addIntegerOption(o => o.setName('percentage').setDescription('Volume van 0 tot 100').setRequired(true).setMinValue(0).setMaxValue(100)))
    .addSubcommand(s => s.setName('status').setDescription('Bekijk de huidige radiozender en het volume'))
    .addSubcommand(s => s.setName('lijst').setDescription('Bekijk de ingestelde radiozenders'))
    .addSubcommand(s => s.setName('instellen').setDescription('Beheerder: sla een radiozender op').addIntegerOption(slot)
        .addStringOption(o => o.setName('naam').setDescription('Naam van de zender').setRequired(true).setMaxLength(80))
        .addStringOption(o => o.setName('url').setDescription('Directe HTTP/HTTPS-audiostream, geen website of afspeellijst').setRequired(true).setMaxLength(1000)));
module.exports = { data, category: 'Community', guildOnly: true, dmAllowed: false, cooldown: 3,
    execute(client, interaction) { return module.exports.run(client, interaction); },
    async run(client, interaction, action = null) {
        if (!interaction.inGuild()) return;
        return config.__context.run(interaction.guildId, async () => {
            const requested = action?.sub || interaction.options.getSubcommand();
            await interaction.deferReply(requested === 'paneel' ? {} : { flags: MessageFlags.Ephemeral });
            const reply = content => send(interaction, 'editReply', { content, allowedMentions: { parse: [] } });
            try {
                await radio.exclusive(interaction.guildId, async () => {
                    const sub = requested;
                    const opts = config.Radio;
                    const member = await interaction.guild.members.fetch(interaction.user.id);
                    const admin = hasOwnerAccess(member, interaction.user.id) || member.permissions.has(PermissionFlagsBits.ManageGuild);
                    if (action && interaction.customId && (interaction.channel?.type !== ChannelType.GuildVoice || member.voice.channelId !== interaction.channelId))
                        throw new Error(tr('Ga in dit spraakkanaal zitten om dit radiopaneel te bedienen.'));
                    if (sub === 'paneel') {
                        if (interaction.channel?.type !== ChannelType.GuildVoice || member.voice.channelId !== interaction.channelId)
                            throw new Error(tr('Gebruik /radio paneel in de chat van het spraakkanaal waarin je zit.'));
                        if (!interaction.channel.permissionsFor(interaction.guild.members.me)?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks]))
                            throw new Error(tr('De bot heeft Berichten verzenden en Links insluiten nodig voor het radiopaneel.'));
                        return send(interaction, 'editReply', require('../../services/radioPanel').payload(opts));
                    }
                    if (sub === 'instellen') {
                        if (!admin) throw new Error(tr('Alleen beheerders met Server beheren of botowners mogen zenders instellen.'));
                        const number = interaction.options.getInteger('zender');
                        const url = radio.validateUrl(interaction.options.getString('url'));
                        const settings = require('../../database/guildSettings');
                        settings.updateValue(interaction.guildId, `Radio.Stations.Station${number}.Name`, interaction.options.getString('naam'));
                        settings.updateValue(interaction.guildId, `Radio.Stations.Station${number}.Url`, url);
                        return reply(tr('Zender {0} opgeslagen. Start met /radio start.', number));
                    }
                    if (sub === 'lijst') {
                        const lines = Object.values(opts.Stations).map((s, i) => s.Url ? `${i+1}. ${s.Name || 'Radio'}` : null).filter(Boolean);
                        return reply(lines.join('\n') || tr('Nog geen zenders ingesteld. Een beheerder kan /radio instellen gebruiken.'));
                    }
                    const active = radio.status(interaction.guildId);
                    if (sub === 'status') return reply(active ? tr('Radio: {0} • kanaal <#{1}> • volume {2}%.', active.name, active.channelId, active.volume) : tr('Er speelt geen radio.'));
                    // Administrators may stop from anywhere, including when radio is disabled.
                    if (sub === 'stop' && admin) { radio.stop(interaction.guildId); return reply(tr('Radio gestopt.')); }
                    if (sub !== 'stop' && !opts.Enabled) throw new Error(tr('Internetradio is uitgeschakeld voor deze server.'));
                    const channel = member.voice.channel;
                    if (!channel || channel.type !== ChannelType.GuildVoice) throw new Error(tr('Ga eerst in een normaal spraakkanaal zitten.'));
                    if (active && active.channelId !== channel.id) throw new Error(tr('De radio speelt in een ander kanaal. Ga naar dat kanaal om hem te bedienen.'));
                    if (sub === 'stop') { radio.stop(interaction.guildId); return reply(tr('Radio gestopt.')); }
                    if (sub === 'volume') return reply(tr('Radiovolume ingesteld op {0}%.', radio.volume(interaction.guildId, action?.delta !== undefined ? (active?.volume ?? 30) + action.delta : interaction.options.getInteger('percentage'))));
                    const station = opts.Stations[`Station${action?.slot || interaction.options.getInteger('zender')}`];
                    if (!station?.Url) throw new Error(tr('Deze zender is nog niet ingesteld. Gebruik /radio lijst.'));
                    const me = interaction.guild.members.me || await interaction.guild.members.fetchMe();
                    if (me.voice.channelId && me.voice.channelId !== channel.id) throw new Error(tr('De bot zit al in een ander spraakkanaal.'));
                    if (!channel.permissionsFor(me)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]))
                        throw new Error(tr('De bot heeft Kanaal bekijken, Verbinden en Spreken nodig in dit kanaal.'));
                    if (channel.full && me.voice.channelId !== channel.id && !channel.permissionsFor(me).has(PermissionFlagsBits.MoveMembers))
                        throw new Error(tr('Dit spraakkanaal is vol.'));
                    radio.install(client);
                    const s = await radio.start(channel, station, opts);
                    return reply(tr('Radio gestart: {0} in <#{1}> op {2}%.', s.name, channel.id, s.volume));
                });
            } catch (error) { return reply(error.message); }
        });
    }
};
