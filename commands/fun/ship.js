const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const config =
    require("../../config/config");



module.exports = {


    data: new SlashCommandBuilder()

        .setName("ship")

        .setDescription(
            "Bekijk de liefde match tussen twee gebruikers."
        )


        .addUserOption(option =>

            option

                .setName("persoon1")

                .setDescription(
                    "De eerste persoon."
                )

                .setRequired(true)

        )


        .addUserOption(option =>

            option

                .setName("persoon2")

                .setDescription(
                    "De tweede persoon."
                )

                .setRequired(true)

        ),



    category: "Fun",


    guildOnly: true,



    async execute(client, interaction) {


        const user1 =
            interaction.options.getUser(
                "persoon1"
            );


        const user2 =
            interaction.options.getUser(
                "persoon2"
            );



        let percentage;



        if (
            user1.id === user2.id
        ) {

            percentage = 100;

        } else {


            const combined =

                user1.id
                +
                user2.id;



            let hash = 0;


            for (
                let i = 0;
                i < combined.length;
                i++
            ) {

                hash +=
                    combined.charCodeAt(i);

            }



            percentage =
                hash % 101;


        }



        let message;



        if (percentage >= 90) {

            message =
                "💖 Perfecte match!";

        }

        else if (percentage >= 70) {

            message =
                "❤️ Mooie combinatie!";

        }

        else if (percentage >= 40) {

            message =
                "💛 Er is potentie!";

        }

        else {

            message =
                "💔 Misschien vrienden blijven...";

        }



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "💘 Love Calculator"
                )


                .setDescription(

                    `${user1} ❤️ ${user2}\n\n` +

                    `💕 Match: **${percentage}%**\n\n` +

                    message

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