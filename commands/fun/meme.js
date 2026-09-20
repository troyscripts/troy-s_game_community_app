const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const config =
    require("../../config/config");

const logger =
    require("../../utils/logger");



module.exports = {


    data: new SlashCommandBuilder()

        .setName("meme")

        .setDescription(
            "Bekijk een willekeurige meme."
        ),



    category: "Fun",


    guildOnly: false,



    async execute(client, interaction) {


        await interaction.deferReply();



        try {


            const response =
                await fetch(
                    "https://meme-api.com/gimme"
                );


            const data =
                await response.json();



            const embed =
                new EmbedBuilder()


                    .setColor(
                        config.Bot.Color
                    )


                    .setTitle(
                        data.title
                    )


                    .setImage(
                        data.url
                    )


                    .setFooter({

                        text:
                        `👍 ${data.ups || 0} | ${config.Bot.Footer}`

                    })


                    .setTimestamp();



            return interaction.editReply({

                embeds:[

                    embed

                ]

            });



        } catch(error) {


            logger.error(`Meme ophalen mislukt: ${error.stack || error}`);



            return interaction.editReply({

                content:
                "❌ Er kon geen meme worden opgehaald."

            });


        }


    }


};
