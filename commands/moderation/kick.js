const { MessageFlags } = require("discord.js");
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

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


            return interaction.editReply({

                content:
                "❌ Deze gebruiker zit niet op de server.",

                flags: MessageFlags.Ephemeral

            });


        }



        if (
            member.id === interaction.user.id
        ) {


            return interaction.editReply({

                content:
                "❌ Je kunt jezelf niet kicken.",

                flags: MessageFlags.Ephemeral

            });


        }



        if (
            member.roles.highest.position >=
            interaction.member.roles.highest.position
        ) {


            return interaction.editReply({

                content:
                "❌ Je kunt geen gebruiker kicken met een gelijke of hogere rol.",

                flags: MessageFlags.Ephemeral

            });


        }



        if (
            !member.kickable
        ) {


            return interaction.editReply({

                content:
                "❌ Ik kan deze gebruiker niet kicken. Controleer mijn rolpositie.",

                flags: MessageFlags.Ephemeral

            });


        }



        await user.send({

            embeds:[

                new EmbedBuilder()

                    .setColor(
                        config.Bot.Color
                    )

                    .setTitle(
                        "👢 Je bent verwijderd"
                    )

                    .setDescription(

                        `Je bent verwijderd uit **${interaction.guild.name}**.\n\n` +

                        `Reden: ${reason}`

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
                    "👢 Gebruiker gekickt"
                )


                .addFields(

                    {

                        name:
                        "Gebruiker",

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
                        "Reden",

                        value:
                        reason

                    }

                )


                .setTimestamp()


                .setFooter({

                    text:
                    config.Bot.Footer

                });



        return interaction.editReply({

            embeds:[

                embed

            ]

        });


    }


};
