const { tr, send } = require("../../utils/localization");
const { MessageFlags } = require("../../utils/discord");
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("../../utils/discord");

const config =
    require("../../config/config");



module.exports = {


    data: new SlashCommandBuilder()

        .setName("timeout")

        .setDescription(
            "Geef een gebruiker een timeout."
        )


        .addUserOption(option =>

            option

                .setName("gebruiker")

                .setDescription(
                    "De gebruiker die een timeout krijgt."
                )

                .setRequired(true)

        )


        .addIntegerOption(option =>

            option

                .setName("duur")

                .setDescription(
                    "Aantal minuten timeout."
                )

                .setRequired(true)

                .setMinValue(1)

                .setMaxValue(40320)

        )


        .addStringOption(option =>

            option

                .setName("reden")

                .setDescription(
                    "Reden van de timeout."
                )

                .setRequired(true)

        ),



    category: "Moderation",


    permissions: [

        "ModerateMembers"

    ],


    guildOnly: true,



    async execute(client, interaction) {

        await interaction.deferReply();


        const user =
            interaction.options.getUser(
                "gebruiker"
            );


        const duration =
            interaction.options.getInteger(
                "duur"
            );


        const reason =
            interaction.options.getString(
                "reden"
            );



        const member =
            await interaction.guild.members.fetch(
                user.id
            ).catch(() => null);



        if (!member) {


            return send(interaction, "editReply", {

                content:
                tr("❌ Deze gebruiker zit niet op de server."),

                flags: MessageFlags.Ephemeral

            });


        }



        if (
            member.id === interaction.user.id
        ) {


            return send(interaction, "editReply", {

                content:
                tr("❌ Je kunt jezelf geen timeout geven."),

                flags: MessageFlags.Ephemeral

            });


        }



        if (
            member.communicationDisabledUntil
        ) {


            return send(interaction, "editReply", {

                content:
                tr("❌ Deze gebruiker heeft al een timeout."),

                flags: MessageFlags.Ephemeral

            });


        }



        if (
            !member.moderatable ||
            member.roles.highest.position >= interaction.member.roles.highest.position
        ) {


            return send(interaction, "editReply", {

                content:
                tr("❌ Je kunt deze gebruiker niet modereren. Controleer de rollenhiërarchie van jou en de bot.")

            });


        }



        await member.timeout(

            duration * 60 * 1000,

            `${reason} | Door: ${interaction.user.tag}`

        );



        const embed =
            new EmbedBuilder()



                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    tr("🔇 Timeout gegeven")
                )


                .addFields(

                    {

                        name:
                        tr("Gebruiker"),

                        value:
                        `${user}`,

                        inline:true

                    },


                    {

                        name:
                        tr("Duur"),

                        value:
                        tr("{0} minuten", duration),

                        inline:true

                    },


                    {

                        name:
                        tr("Reden"),

                        value:
                        reason

                    },


                    {

                        name:
                        "Moderator",

                        value:
                        `${interaction.user}`

                    }

                )


                .setTimestamp()


                .setFooter({

                    text:
                    config.Bot.Footer

                });



        await send(interaction, "editReply", {

            embeds:[

                embed

            ]

        });



        await send(user, "send", {

            embeds:[

                new EmbedBuilder()

                    .setColor(
                        config.Bot.Color
                    )

                    .setTitle(
                        tr("🔇 Je hebt een timeout ontvangen")
                    )

                    .setDescription(

                        tr("Server: {0}\n\n", interaction.guild.name) +

                        tr("Duur: {0} minuten\n", duration) +

                        tr("Reden: {0}", reason)

                    )

                    .setTimestamp()

            ]

        }).catch(() => {});



    }


};
