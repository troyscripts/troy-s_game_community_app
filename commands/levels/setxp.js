const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const levels =
    require("../../database/levels");

const config =
    require("../../config/config");



module.exports = {


    data: new SlashCommandBuilder()

        .setName("setxp")

        .setDescription(
            "Stel de XP van een gebruiker in."
        )


        .addUserOption(option =>

            option

                .setName("gebruiker")

                .setDescription(
                    "De gebruiker waarvan je XP wilt aanpassen."
                )

                .setRequired(true)

        )


        .addIntegerOption(option =>

            option

                .setName("xp")

                .setDescription(
                    "Nieuwe XP waarde."
                )

                .setRequired(true)

                .setMinValue(0)

        ),



    category: "Levels",


    permissions: [

        "ManageGuild"

    ],


    guildOnly: true,



    async execute(client, interaction) {


        const user =
            interaction.options.getUser(
                "gebruiker"
            );


        const xp =
            interaction.options.getInteger(
                "xp"
            );



        const levelUser = levels.setXP(

            user.id,

            interaction.guild.id,

            xp

        );



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "⭐ XP aangepast"
                )


                .addFields(

                    {

                        name:
                        "Gebruiker",

                        value:
                        `${user}`,

                        inline:true

                    },


                    {

                        name:
                        "Nieuwe XP",

                        value:
                        `${levelUser.xp}`,

                        inline:true

                    },


                    {

                        name:
                        "Uitgevoerd door",

                        value:
                        `${interaction.user}`

                    }

                )


                .setTimestamp()


                .setFooter({

                    text:
                    config.Bot.Footer

                });



        return interaction.reply({

            embeds:[

                embed

            ]

        });


    }


};
