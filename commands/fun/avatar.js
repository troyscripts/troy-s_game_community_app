const {
    SlashCommandBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder
} = require("discord.js");

const config =
    require("../../config/config");



module.exports = {


    data: new SlashCommandBuilder()

        .setName("avatar")

        .setDescription(
            "Bekijk de avatar van een gebruiker."
        )


        .addUserOption(option =>

            option

                .setName("gebruiker")

                .setDescription(
                    "Van welke gebruiker wil je de avatar zien?"
                )

                .setRequired(false)

        ),



    category: "Fun",


    guildOnly: false,



    async execute(client, interaction) {


        const user =
            interaction.options.getUser(
                "gebruiker"
            )
            ||
            interaction.user;



        const avatar =
            user.displayAvatarURL({

                size: 4096,

                dynamic:true

            });



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    `🖼️ Avatar van ${user.tag}`
                )


                .setImage(
                    avatar
                )


                .setTimestamp()


                .setFooter({

                    text:
                    config.Bot.Footer

                });



        const button =
            new ButtonBuilder()

                .setLabel(
                    "Open afbeelding"
                )

                .setStyle(
                    ButtonStyle.Link
                )

                .setURL(
                    avatar
                );



        const row =
            new ActionRowBuilder()

                .addComponents(

                    button

                );



        return interaction.reply({

            embeds:[

                embed

            ],

            components:[

                row

            ]

        });


    }


};