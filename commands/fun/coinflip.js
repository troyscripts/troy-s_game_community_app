const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const config =
    require("../../config/config");



module.exports = {


    data: new SlashCommandBuilder()

        .setName("coinflip")

        .setDescription(
            "Gooi een muntje."
        ),



    category: "Fun",


    guildOnly: false,



    async execute(client, interaction) {


        const result =
            Math.random() < 0.5
                ? "Kop"
                : "Munt";



        const emoji =
            result === "Kop"
                ? "🪙"
                : "💰";



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "🪙 Coinflip"
                )


                .setDescription(

                    `${interaction.user} gooide een muntje.\n\n` +

                    `${emoji} **${result}!**`

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