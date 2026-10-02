const { SlashCommandBuilder, ChannelType, MessageFlags, PermissionFlagsBits } = require('discord.js');
const config = require('../../config/config');
const store = require('../../database/notify');
const providers = require('../../services/notify/providers');
const service = require('../../services/notifyService');
const guildSettings = require('../../database/guildSettings');
const { hasNotifyAccess } = require('../../utils/permissions');
const data = new SlashCommandBuilder().setName('notify').setDescription('Beheer automatische creatormeldingen').setDMPermission(false)
    .addSubcommand(s => s.setName('toevoegen').setDescription('Creator toevoegen of kanaal/bericht/ping wijzigen')
        .addStringOption(o => o.setName('platform').setDescription('Platform').setRequired(true).addChoices({name:'YouTube',value:'youtube'},{name:'TikTok',value:'tiktok'},{name:'Twitch',value:'twitch'}))
        .addStringOption(o => o.setName('creator').setDescription('Profiel-URL, @handle of YouTube UC-kanaal-ID').setRequired(true).setMaxLength(200))
        .addChannelOption(o => o.setName('kanaal').setDescription('Waar video- en livemeldingen verschijnen').setRequired(true).addChannelTypes(ChannelType.GuildText,ChannelType.GuildAnnouncement))
        .addIntegerOption(o => o.setName('pingkeuze').setDescription('Gebruik een van de vier geconfigureerde pingrollen').addChoices({name:'Pingrol 1',value:1},{name:'Pingrol 2',value:2},{name:'Pingrol 3',value:3},{name:'Pingrol 4',value:4}))
        .addRoleOption(o => o.setName('pingrol').setDescription('Optionele rolvermelding; weglaten verwijdert de ping'))
        .addStringOption(o => o.setName('bericht').setDescription('Optioneel: {creator}, {platform}, {titel}, {url}').setMaxLength(600)))
    .addSubcommand(s => s.setName('pingrol').setDescription('Stel een van de vier pingrollen voor deze server in')
        .addIntegerOption(o => o.setName('nummer').setDescription('Pingrol 1 tot en met 4').setRequired(true).setMinValue(1).setMaxValue(4))
        .addRoleOption(o => o.setName('rol').setDescription('De Discordrol; leeg laten schakelt deze pingrol uit')))
    .addSubcommand(s => s.setName('lijst').setDescription('Creators, kanalen, status en eventuele fouten bekijken')
        .addIntegerOption(o => o.setName('pagina').setDescription('Pagina van 5 creators').setMinValue(1)))
    .addSubcommand(s => s.setName('verwijderen').setDescription('Stop meldingen van een creator in deze server')
        .addIntegerOption(o => o.setName('id').setDescription('Nummer uit /notify lijst').setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName('test').setDescription('Plaats een voorbeeldmelding zonder ping of videohistorie te wijzigen')
        .addIntegerOption(o => o.setName('id').setDescription('Nummer uit /notify lijst').setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName('youtube-id').setDescription('Stel het UC-ID in als automatisch herkennen van de handle mislukt')
        .addIntegerOption(o => o.setName('id').setDescription('Nummer uit /notify lijst').setRequired(true).setMinValue(1))
        .addStringOption(o => o.setName('kanaal-id').setDescription('UC-kanaal-ID uit YouTube Studio').setRequired(true)));
module.exports = {data,category:'Beheer',guildOnly:true,dmAllowed:false,notifyOnly:true,cooldown:5,
    async execute(client,interaction) {
        // Explicit guild scope also protects direct invocations outside the event wrapper.
        return config.__context.run(interaction.guildId,async () => {
            if (!interaction.inGuild() || !hasNotifyAccess(interaction.member,interaction.user.id)) return interaction.reply({content:'Alleen Head Admin, Owner en Developer mogen notify beheren.',flags:MessageFlags.Ephemeral});
            await interaction.deferReply({flags:MessageFlags.Ephemeral});
            try {
                const sub = interaction.options.getSubcommand();
                if (sub === 'pingrol') {
                    const number = interaction.options.getInteger('nummer');
                    const role = interaction.options.getRole('rol');
                    if (role && (role.id === interaction.guildId || role.managed)) throw new Error('Kies een gewone rol, niet @everyone of een beheerde integratierol.');
                    guildSettings.updateValue(interaction.guildId,`Notify.PingRole${number}`,role?.id || 'geen');
                    for (const row of store.list(interaction.guildId)) if (row.role_slot === number) service.retry(row.id);
                    return interaction.editReply({content:`Pingrol ${number} ${role ? `ingesteld op <@&${role.id}>` : 'uitgeschakeld'}. Gekoppelde creators volgen deze instelling automatisch.`,allowedMentions:{parse:[]}});
                }
                if (sub === 'toevoegen') {
                    const platform = interaction.options.getString('platform');
                    const account = providers.account(platform,interaction.options.getString('creator'));
                    const channel = await interaction.guild.channels.fetch(interaction.options.getChannel('kanaal').id);
                    service.checkChannel(channel,interaction.guildId);
                    const directRole = interaction.options.getRole('pingrol');
                    const slot = interaction.options.getInteger('pingkeuze');
                    if (slot && directRole) throw new Error('Kies pingkeuze OF een losse pingrol.');
                    const configuredId = slot ? config.Notify?.[`PingRole${slot}`] : null;
                    if (slot && !configuredId) throw new Error(`Pingrol ${slot} is nog leeg. Stel hem eerst in met /notify pingrol of /config instellen.`);
                    const role = slot ? await interaction.guild.roles.fetch(configuredId) : directRole;
                    if (slot && !role) throw new Error('De ingestelde pingrol bestaat niet meer. Stel de rol opnieuw in.');
                    if (role && (role.id === interaction.guildId || role.managed || (!role.mentionable && !channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.MentionEveryone)))) throw new Error('Kies een vermeldbare, gewone rol; @everyone is niet toegestaan.');
                    const existing = store.list(interaction.guildId);
                    if (existing.length >= 100 && !existing.some(r => r.platform === platform && r.account === account)) throw new Error('Maximaal 100 creatoraccounts per server.');
                    const row = store.save(interaction.guildId,platform,account,channel.id,slot ? null : role?.id || null,interaction.options.getString('bericht') || '',slot);
                    service.retry(row.id);
                    return interaction.editReply({content:`Creator #${row.id}: **${account}** (${platform}) → <#${channel.id}>. Controle iedere vijf minuten. ${platform === 'twitch' ? 'Een actieve livestream wordt bij de eerste controle eenmaal gemeld. Twitch vereist TWITCH_CLIENT_ID en TWITCH_CLIENT_SECRET in .env.' : 'Bestaande video’s worden bij de eerste succesvolle controle overgeslagen.'}${platform === 'tiktok' ? '\nTikTok vereist een geautoriseerde accountkoppeling; zie NOTIFY-HANDLEIDING.md.' : ''}`,allowedMentions:{parse:[]}});
                }
                if (sub === 'lijst') {
                    const rows = store.list(interaction.guildId);
                    const page = interaction.options.getInteger('pagina') || 1;
                    const selected = rows.slice((page-1)*5,page*5);
                    const lines = selected.map(service.withPingRole).map(r => `**#${r.id} — ${r.account} (${r.platform})**\nKanaal: <#${r.channel_id}>${r.role_id ? ` • Rol: <@&${r.role_id}>` : ''}${r.role_slot ? ` (pingkeuze ${r.role_slot})` : ''}\n${r.error ? `⚠️ ${r.error}` : r.checked_at ? `Laatste controle: <t:${Math.floor(r.checked_at/1000)}:R>` : 'Wacht op eerste controle.'}`);
                    return interaction.editReply({content:(lines.join('\n\n') || 'Geen creators op deze pagina.')+`\n\nPagina ${page}/${Math.max(1,Math.ceil(rows.length/5))}`,allowedMentions:{parse:[]}});
                }
                const row = store.get(interaction.options.getInteger('id'),interaction.guildId);
                if (!row) throw new Error('Deze creator bestaat niet in deze server. Gebruik /notify lijst.');
                if (sub === 'verwijderen') {
                    store.remove(row.id,interaction.guildId); service.retry(row.id);
                    return interaction.editReply('Creator verwijderd. Automatische startinstellingen plaatsen hem niet terug.');
                }
                if (sub === 'youtube-id') {
                    const id = interaction.options.getString('kanaal-id').trim();
                    if (row.platform !== 'youtube' || !/^UC[\w-]{22}$/.test(id)) throw new Error('Kies een YouTube-creator en een geldig UC-kanaal-ID.');
                    if (row.resolved_id && row.resolved_id !== id && row.baseline_at !== null) throw new Error('Dit account is al herkend. Voeg een ander kanaal als nieuwe creator toe.');
                    await providers.youtube({...row, resolved_id:id});
                    store.resolved(row.id,id); service.retry(row.id);
                    return interaction.editReply('YouTube-kanaal-ID opgeslagen. De volgende controle volgt binnen vijf minuten.');
                }
                const channel = await interaction.guild.channels.fetch(row.channel_id);
                service.checkChannel(channel,interaction.guildId);
                const url = row.platform === 'youtube' ? (/^UC/.test(row.account) ? `https://www.youtube.com/channel/${row.account}` : `https://www.youtube.com/${encodeURI(row.account)}`) : row.platform === 'twitch' ? `https://www.twitch.tv/${row.account}` : `https://www.tiktok.com/@${row.account}`;
                await channel.send(service.payload(row,{id:'test',title:row.platform === 'twitch' ? 'Voorbeeld van een livestream' : 'Voorbeeld van een nieuwe video',url},true));
                return interaction.editReply('Testmelding geplaatst zonder rolping. Dit test het Discordkanaal; /notify lijst toont de status van de platformkoppeling.');
            } catch (error) {
                return interaction.editReply({content:`❌ ${error.message}`,allowedMentions:{parse:[]}});
            }
        });
    }
};
