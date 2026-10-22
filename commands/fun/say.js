const { tr, send, pair } = require("../../utils/localization");
const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    MessageFlags,
    ChannelType
} = require("../../utils/discord");

const config =
    require("../../config/config");



module.exports = {


    data: new SlashCommandBuilder()

        .setName("say")

        .setDescription(
            "Laat de bot een bericht sturen."
        )


        .addStringOption(option =>

            option

                .setName("bericht")

                .setDescription(
                    "Het bericht dat de bot moet sturen."
                )

                .setRequired(true)

                .setMinLength(1)

                .setMaxLength(2000)

        )


        .addBooleanOption(option =>

            option

                .setName("embed")

                .setDescription(
                    "Wil je het bericht als embed versturen?"
                )

                .setRequired(true)

        )


        .addChannelOption(option =>

            option

                .setName("kanaal")

                .setDescription(
                    "Kies het kanaal waarin het bericht moet komen."
                )

                .addChannelTypes(
                    ChannelType.GuildText,
                    ChannelType.GuildAnnouncement
                )

                .setRequired(false)

        )



        .addBooleanOption(o => o.setName('vertalen')
            .setDescription('Vertaal je bericht naar het Engels en plaats beide talen. Standaard: nee.'))
        .addStringOption(o => o.setName('engels')
            .setDescription('Optioneel: eigen Engelse vertaling; plaats deze onder je bericht.').setMaxLength(4000))

        .setDefaultMemberPermissions(

            null

        ),



    category: "Fun",
    permissions: ["ManageMessages"],


    guildOnly: true,



    async execute(client, interaction) {

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });


        let message =
            interaction.options.getString(
                "bericht"
            );


        const useEmbed =
            interaction.options.getBoolean(
                "embed",
                true
            );


        const targetChannel =
            interaction.options.getChannel(
                "kanaal"
            )
            ||
            interaction.channel;


        const memberPermissions =
            targetChannel.permissionsFor(
                interaction.member
            );


        if (
            !memberPermissions?.has(PermissionFlagsBits.ViewChannel) ||
            !memberPermissions.has(PermissionFlagsBits.SendMessages)
        ) {


            return send(interaction, "editReply", {

                content:
                tr("❌ Je hebt geen toestemming om in dat kanaal te schrijven.")

            });


        }


        const botPermissions =
            targetChannel.permissionsFor(
                interaction.guild.members.me
            );


        if (
            !botPermissions?.has(PermissionFlagsBits.ViewChannel) ||
            !botPermissions.has(PermissionFlagsBits.SendMessages) ||
            (useEmbed && !botPermissions.has(PermissionFlagsBits.EmbedLinks))
        ) {


            return send(interaction, "editReply", {

                content:
                tr("❌ De bot kan in dat kanaal geen bericht van dit type plaatsen.")

            });


        }



        const manualEnglish = interaction.options.getString('engels');
        if (interaction.options.getBoolean('vertalen') || manualEnglish !== null) {
            try {
                const english = await require('../../services/textTranslation').translate(message, manualEnglish);
                message = pair(message, english);
            } catch (error) {
                return send(interaction, 'editReply', {content:error.message,allowedMentions:{parse:[]}});
            }
        }

        const payload = useEmbed
            ? {
                embeds: [
                    new EmbedBuilder()

                        .setColor(
                            config.Bot.Color
                        )

                        .setDescription(
                            message
                        )

                        .setFooter({

                            text:
                            tr("Verstuurd door {0}", interaction.user.tag)

                        })

                        .setTimestamp()
                ],
                allowedMentions: { parse: [] }
            }
            : {
                content: message,
                allowedMentions: { parse: ["users", "roles"] }
            };



        await send(targetChannel, "send", payload);



        await send(interaction, "editReply", {

            content:
            tr("✅ Bericht verstuurd in {0}.", targetChannel)

        });


    }


};
