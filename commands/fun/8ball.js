const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const config =
    require("../../config/config");



module.exports = {


    data: new SlashCommandBuilder()

        .setName("8ball")

        .setDescription(
            "Stel een vraag aan de magische 8-ball."
        )


        .addStringOption(option =>

            option

                .setName("vraag")

                .setDescription(
                    "De vraag die je wilt stellen."
                )

                .setRequired(true)

        ),



    category: "Fun",


    guildOnly: false,



    async execute(client, interaction) {


        const question =
            interaction.options.getString(
                "vraag"
            );



        const answers = [

            "Ja, absoluut! ✅",

            "Zeker weten! 😎",

            "Dat ziet er goed uit! ✨",

            "Misschien... 🤔",

            "Vraag het later nog eens. ⏳",

            "Ik denk het niet. ❌",

            "Mijn bronnen zeggen van niet. 😅",

            "Daar moet je zelf achter komen 😉",

            "De toekomst is onzeker 🔮",

            "100% zeker! 💯"

        ];



        const answer =
            answers[

                Math.floor(

                    Math.random() * answers.length

                )

            ];



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "🎱 Magic 8-Ball"
                )


                .addFields(

                    {

                        name:
                        "Vraag",

                        value:
                        question

                    },


                    {

                        name:
                        "Antwoord",

                        value:
                        answer

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