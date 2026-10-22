const { tr, send } = require("../../utils/localization");
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("../../utils/discord");

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

            tr("Ja, absoluut! ✅"),

            tr("Zeker weten! 😎"),

            tr("Dat ziet er goed uit! ✨"),

            tr("Misschien... 🤔"),

            tr("Vraag het later nog eens. ⏳"),

            tr("Ik denk het niet. ❌"),

            tr("Mijn bronnen zeggen van niet. 😅"),

            tr("Daar moet je zelf achter komen 😉"),

            tr("De toekomst is onzeker 🔮"),

            tr("100% zeker! 💯")

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
                        tr("Vraag"),

                        value:
                        question

                    },


                    {

                        name:
                        tr("Antwoord"),

                        value:
                        answer

                    }

                )


                .setTimestamp()


                .setFooter({

                    text:
                    config.Bot.Footer

                });



        return send(interaction, "reply", {

            embeds:[

                embed

            ]

        });


    }


};