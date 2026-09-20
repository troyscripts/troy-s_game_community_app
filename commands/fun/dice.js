const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const config =
    require("../../config/config");



module.exports = {


    data: new SlashCommandBuilder()

        .setName("dice")

        .setDescription(
            "Gooi een dobbelsteen."
        )



        .addIntegerOption(option =>

            option

                .setName("zijden")

                .setDescription(
                    "Aantal zijden van de dobbelsteen."
                )

                .setRequired(false)

                .setMinValue(2)

                .setMaxValue(100)

        ),



    category: "Fun",


    guildOnly: false,



    async execute(client, interaction) {


        const sides =
            interaction.options.getInteger(
                "zijden"
            ) || 6;



        const roll =
            Math.floor(

                Math.random() * sides

            ) + 1;



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "🎲 Dobbelsteen"
                )


                .setDescription(

                    `${interaction.user} heeft gegooid:\n\n` +

                    `🎲 **${roll}** van **${sides}**`

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