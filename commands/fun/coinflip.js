const { tr, send } = require("../../utils/localization");
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("../../utils/discord");

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
                ? tr("Kop")
                : tr("Munt");



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

                    tr("{0} gooide een muntje.\n\n", interaction.user) +

                    `${emoji} **${result}!**`

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