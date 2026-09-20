const { MessageFlags } = require("discord.js");
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const config =
    require("../../config/config");



module.exports = {


    data: new SlashCommandBuilder()

        .setName("ban")

        .setDescription(
            "Verban een gebruiker van de server."
        )


        .addUserOption(option =>

            option

                .setName("gebruiker")

                .setDescription(
                    "De gebruiker die je wilt bannen."
                )

                .setRequired(true)

        )


        .addStringOption(option =>

            option

                .setName("reden")

                .setDescription(
                    "Reden van de ban."
                )

                .setRequired(true)

        )



        .addIntegerOption(option =>

            option

                .setName("dagen")

                .setDescription(
                    "Aantal dagen berichten verwijderen."
                )

                .setRequired(false)

                .setMinValue(0)

                .setMaxValue(7)

        ),



    category: "Moderation",


    permissions: [

        "BanMembers"

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


        const days =
            interaction.options.getInteger(
                "dagen"
            ) ?? 0;



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
                "❌ Je kunt jezelf niet bannen.",

                flags: MessageFlags.Ephemeral

            });


        }



        if (
            member.roles.highest.position >=
            interaction.member.roles.highest.position
        ) {


            return interaction.editReply({

                content:
                "❌ Je kunt geen gebruiker bannen met een gelijke of hogere rol.",

                flags: MessageFlags.Ephemeral

            });


        }



        if (
            !member.bannable
        ) {


            return interaction.editReply({

                content:
                "❌ Ik kan deze gebruiker niet bannen. Controleer mijn rolpositie.",

                flags: MessageFlags.Ephemeral

            });


        }



        await user.send({

            embeds:[

                new EmbedBuilder()

                    .setColor(
                        "#ff0000"
                    )

                    .setTitle(
                        "🔨 Je bent verbannen"
                    )

                    .setDescription(

                        `Je bent verbannen uit **${interaction.guild.name}**.\n\n` +

                        `Reden: ${reason}`

                    )

                    .setTimestamp()

            ]

        }).catch(() => {});



        await member.ban({

            deleteMessageSeconds:
            days * 86400,


            reason:
            `${reason} | Door: ${interaction.user.tag}`

        });



        const embed =
            new EmbedBuilder()


                .setColor(
                    "#ff0000"
                )


                .setTitle(
                    "🔨 Gebruiker verbannen"
                )


                .addFields(

                    {

                        name:
                        "Gebruiker",

                        value:
                        `${user.tag}\n${user.id}`,

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

                    },


                    {

                        name:
                        "Berichten verwijderd",

                        value:
                        `${days} dag(en)`

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
