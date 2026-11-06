const { tr, send } = require('../../utils/localization');
const { SlashCommandBuilder, EmbedBuilder } = require('../../utils/discord');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban').setDescription('Verban een gebruiker van de server.')
        .addStringOption(o => o.setName('reden').setDescription('Reden van de ban.').setRequired(true).setMaxLength(400))
        .addUserOption(o => o.setName('gebruiker').setDescription('De gebruiker die je wilt bannen.'))
        .addStringOption(o => o.setName('discord-id').setDescription('Discord-ID van de gebruiker, ook als die niet in de server zit.').setMinLength(17).setMaxLength(20))
        .addIntegerOption(o => o.setName('dagen').setDescription('Aantal dagen berichten verwijderen.').setMinValue(0).setMaxValue(7)),
    category: 'Moderation', permissions: ['BanMembers'], guildOnly: true,

    async execute(client, interaction) {
        await interaction.deferReply();
        const fail = text => send(interaction, 'editReply', { content: tr(text), allowedMentions: { parse: [] } });
        const user = interaction.options.getUser('gebruiker');
        const suppliedId = interaction.options.getString('discord-id');
        const reason = interaction.options.getString('reden').trim();
        const days = interaction.options.getInteger('dagen') ?? 0;
        if (Boolean(user) === Boolean(suppliedId)) return fail('❌ Kies één gebruiker óf vul één Discord-ID in.');
        const id = suppliedId?.trim() || user.id;
        if (!/^[1-9]\d{16,19}$/.test(id) || BigInt(id) > 18446744073709551615n) return fail('❌ Vul een geldig Discord-gebruikers-ID in (17 tot 20 cijfers).');
        if (!reason || reason.length > 400) return fail('❌ Geef een reden van 1 tot 400 tekens op.');
        if (!Number.isInteger(days) || days < 0 || days > 7) return fail('❌ Kies 0 tot en met 7 dagen.');
        if (id === interaction.user.id) return fail('❌ Je kunt jezelf niet bannen.');
        if (id === client.user.id) return fail('❌ Je kunt de bot zelf niet bannen.');
        if (id === interaction.guild.ownerId) return fail('❌ Je kunt de servereigenaar niet bannen.');

        // Only Unknown Member means the user is outside the guild. Fail closed on API/network errors.
        let member;
        try {
            member = await interaction.guild.members.fetch({ user: id, force: true });
        } catch (error) {
            if (Number(error.code) !== 10007) throw error;
        }
        if (member) {
            const moderator = await interaction.guild.members.fetch({ user: interaction.user.id, force: true });
            if (interaction.user.id !== interaction.guild.ownerId &&
                member.roles.highest.comparePositionTo(moderator.roles.highest) >= 0) {
                return fail('❌ Je kunt geen gebruiker bannen met een gelijke of hogere rol.');
            }
            if (!member.bannable) return fail('❌ Ik kan deze gebruiker niet bannen. Controleer mijn rolpositie.');
        }

        try {
            await interaction.guild.bans.create(id, {
                deleteMessageSeconds: days * 86400,
                reason: `${reason} | Door: ${interaction.user.tag} (${interaction.user.id})`.slice(0, 512)
            });
        } catch (error) {
            if (Number(error.code) === 10013) return fail('❌ Er bestaat geen Discord-gebruiker met dit ID.');
            if ([50013, 50001].includes(Number(error.code))) return fail('❌ Discord weigert de ban. Controleer mijn banrechten en rolpositie.');
            throw error;
        }

        // Notify only after Discord confirmed the ban; a closed DM must not affect the result.
        const target = user || member?.user;
        if (target) await send(target, 'send', {
            embeds: [new EmbedBuilder().setColor('#ff0000').setTitle(tr('🔨 Je bent verbannen'))
                .setDescription(tr('Je bent verbannen uit **{0}**.\n\n', interaction.guild.name) + tr('Reden: {0}', reason)).setTimestamp()],
            allowedMentions: { parse: [] }
        }).catch(() => {});

        return send(interaction, 'editReply', {
            embeds: [new EmbedBuilder().setColor('#ff0000').setTitle(tr('🔨 Gebruiker verbannen'))
                .addFields(
                    { name: tr('Gebruiker'), value: target ? `${target.tag}\n${id}` : id, inline: true },
                    { name: 'Moderator', value: `${interaction.user}`, inline: true },
                    { name: tr('Reden'), value: reason },
                    { name: tr('Berichten verwijderd'), value: tr('{0} dag(en)', days) })
                .setTimestamp().setFooter({ text: config.Bot.Footer })],
            allowedMentions: { parse: [] }
        });
    }
};
