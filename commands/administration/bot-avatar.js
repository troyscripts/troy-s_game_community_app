const { SlashCommandBuilder, MessageFlags, AttachmentBuilder } = require('discord.js');
const { hasOwnerAccess } = require('../../utils/permissions');
const avatars = require('../../database/botAvatars');
const { downloadImage, change } = require('../../services/botAvatar');
const logger = require('../../utils/logger');
module.exports = {
    data: new SlashCommandBuilder().setName('bot-avatar').setDescription('Beheer de profielfoto van de bot op deze server.')
        .addSubcommand(sub=>sub.setName('instellen').setDescription('Upload een servergebonden botprofielfoto en sla deze op.')
            .addAttachmentOption(option=>option.setName('afbeelding').setDescription('PNG, JPG of GIF van maximaal 2 MB').setRequired(true)))
        .addSubcommand(sub=>sub.setName('bekijken').setDescription('Bekijk de opgeslagen profielfoto voor deze server.'))
        .addSubcommand(sub=>sub.setName('herstellen').setDescription('Verwijder de serverfoto en gebruik de standaard botprofielfoto.')),
    category: 'Beheer', guildOnly: true, ownerOnly: true, cooldown: 10,
    async execute(client, interaction) {
        if (!interaction.guild || !hasOwnerAccess(interaction.member,interaction.user.id)) {
            return interaction.reply({content:'❌ Alleen de owner en de ingestelde Developer-rol mogen de botprofielfoto beheren.',flags:MessageFlags.Ephemeral});
        }
        await interaction.deferReply({flags:MessageFlags.Ephemeral});
        try {
            const action=interaction.options.getSubcommand();
            const guildId=interaction.guild.id;
            if (action==='bekijken') {
                const saved=avatars.get(guildId);
                if (!saved) return interaction.editReply({content:'ℹ️ Er is geen aparte profielfoto opgeslagen voor deze server.'});
                const ext={'image/png':'png','image/jpeg':'jpg','image/gif':'gif'}[saved.mime_type];
                return interaction.editReply({content:`🖼️ Opgeslagen botprofielfoto voor deze server. Bijgewerkt <t:${saved.updated_at}:f>.`,files:[new AttachmentBuilder(saved.image,{name:`bot-avatar-${guildId}.${ext}`})]});
            }
            if (action==='instellen') {
                const image=await downloadImage(interaction.options.getAttachment('afbeelding',true));
                await change(client,guildId,interaction.user.id,image);
                return interaction.editReply({content:'✅ De botprofielfoto is ingesteld en opgeslagen voor deze server. Andere servers behouden hun eigen foto. Discord kan even nodig hebben om de nieuwe foto te tonen.'});
            }
            if (action==='herstellen') {
                await change(client,guildId,interaction.user.id,null);
                return interaction.editReply({content:'✅ Deze server gebruikt weer de standaard botprofielfoto. De aparte foto is uit de database verwijderd.'});
            }
            throw new Error('Onbekende actie.');
        } catch(error) {
            logger.error(`Bot-avatar mislukt voor server ${interaction.guild.id}: ${error.message}`);
            return interaction.editReply({content:`❌ ${String(error.message).slice(0,1700)}`,allowedMentions:{parse:[]}});
        }
    }
};
