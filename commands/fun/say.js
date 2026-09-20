const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    MessageFlags,
    ChannelType
} = require("discord.js");

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



        .setDefaultMemberPermissions(

            PermissionFlagsBits.ManageMessages

        ),



    category: "Fun",


    guildOnly: true,



    async execute(client, interaction) {

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });


        const message =
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


            return interaction.editReply({

                content:
                "❌ Je hebt geen toestemming om in dat kanaal te schrijven."

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


            return interaction.editReply({

                content:
                "❌ De bot kan in dat kanaal geen bericht van dit type plaatsen."

            });


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
                            `Verstuurd door ${interaction.user.tag}`

                        })

                        .setTimestamp()
                ],
                allowedMentions: { parse: [] }
            }
            : {
                content: message,
                allowedMentions: { parse: ["users", "roles"] }
            };



        await targetChannel.send(payload);



        await interaction.editReply({

            content:
            `✅ Bericht verstuurd in ${targetChannel}.`

        });


    }


};
