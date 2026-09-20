const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const config =
    require("../../config/config");



module.exports = {


    data: new SlashCommandBuilder()

        .setName("ping")

        .setDescription(
            "Bekijk de ping van de bot."
        ),



    category: "Fun",


    guildOnly: false,



    async execute(client, interaction) {


        const sent =
            await interaction.reply({

                content:
                "🏓 Ping meten...",

                fetchReply:true

            });



        const botPing =
            sent.createdTimestamp -
            interaction.createdTimestamp;



        const apiPing =
            client.ws.ping;



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "🏓 Pong!"
                )


                .addFields(

                    {

                        name:
                        "Bot latency",

                        value:
                        `${botPing}ms`,

                        inline:true

                    },


                    {

                        name:
                        "Discord API",

                        value:
                        `${apiPing}ms`,

                        inline:true

                    }

                )


                .setTimestamp()


                .setFooter({

                    text:
                    config.Bot.Footer

                });



        return interaction.editReply({

            content:"",

            embeds:[

                embed

            ]

        });


    }


};