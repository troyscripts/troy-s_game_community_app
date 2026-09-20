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

        .setName("resetxp")

        .setDescription(
            "Reset de XP van een gebruiker."
        )


        .addUserOption(option =>

            option

                .setName("gebruiker")

                .setDescription(
                    "De gebruiker waarvan je XP wilt resetten."
                )

                .setRequired(true)

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



        levels.resetXP(

            user.id,

            interaction.guild.id

        );



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "🔄 XP gereset"
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
                        "Uitgevoerd door",

                        value:
                        `${interaction.user}`,

                        inline:true

                    },


                    {

                        name:
                        "Nieuwe status",

                        value:
                        "Level 1\nXP 0\nBerichten 0"

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