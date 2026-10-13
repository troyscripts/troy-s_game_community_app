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

        .setName("kick")

        .setDescription(
            "Verwijder een gebruiker van de server."
        )


        .addUserOption(option =>

            option

                .setName("gebruiker")

                .setDescription(
                    "De gebruiker die je wilt kicken."
                )

                .setRequired(true)

        )


        .addStringOption(option =>

            option

                .setName("reden")

                .setDescription(
                    "Reden van de kick."
                )

                .setRequired(true)

        ),



    category: "Moderation",


    permissions: [

        "KickMembers"

    ],


    guildOnly: true,



    async execute(client, interaction) {

        await interaction.deferReply();


        const user =
            interaction.options.getUser(
                "gebruiker"
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
                tr("❌ Je kunt jezelf niet kicken."),

                flags: MessageFlags.Ephemeral

            });


        }



        if (
            member.roles.highest.position >=
            interaction.member.roles.highest.position
        ) {


            return send(interaction, "editReply", {

                content:
                tr("❌ Je kunt geen gebruiker kicken met een gelijke of hogere rol."),

                flags: MessageFlags.Ephemeral

            });


        }



        if (
            !member.kickable
        ) {


            return send(interaction, "editReply", {

                content:
                tr("❌ Ik kan deze gebruiker niet kicken. Controleer mijn rolpositie."),

                flags: MessageFlags.Ephemeral

            });


        }



        await send(user, "send", {

            embeds:[

                new EmbedBuilder()

                    .setColor(
                        config.Bot.Color
                    )

                    .setTitle(
                        tr("👢 Je bent verwijderd")
                    )

                    .setDescription(

                        tr("Je bent verwijderd uit **{0}**.\n\n", interaction.guild.name) +

                        tr("Reden: {0}", reason)

                    )

                    .setTimestamp()

            ]

        }).catch(() => {});



        await member.kick(

            `${reason} | Door: ${interaction.user.tag}`

        );



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    tr("👢 Gebruiker gekickt")
                )


                .addFields(

                    {

                        name:
                        tr("Gebruiker"),

                        value:
                        `${user.tag}`,

                        inline:true

                    },


                    {

                        name:
                        "Moderator",

                        value:
                        `${interaction.user}`,

                        inline:true

                    },


                    {

                        name:
                        tr("Reden"),

                        value:
                        reason

                    }

                )


                .setTimestamp()


                .setFooter({

                    text:
                    config.Bot.Footer

                });



        return send(interaction, "editReply", {

            embeds:[

                embed

            ]

        });


    }


};
