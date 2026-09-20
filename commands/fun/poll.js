const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags
} = require("discord.js");

const config =
    require("../../config/config");



module.exports = {


    data: new SlashCommandBuilder()

        .setName("poll")

        .setDescription(
            "Maak een poll."
        )


        .addStringOption(option =>

            option

                .setName("vraag")

                .setDescription(
                    "De vraag voor de poll."
                )

                .setRequired(true)

        ),



    category: "Fun",


    guildOnly: true,



    async execute(client, interaction) {

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });


        const question =
            interaction.options.getString(
                "vraag"
            );



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "📊 Poll"
                )


                .setDescription(

                    `${question}\n\n` +

                    "👍 = Ja\n" +

                    "👎 = Nee"

                )


                .setFooter({

                    text:
                    `Poll gemaakt door ${interaction.user.tag}`

                })


                .setTimestamp();



        const message =
            await interaction.channel.send({

                embeds:[

                    embed

                ]

            });



        await message.react("👍");

        await message.react("👎");



        await interaction.editReply({

            content:
            "✅ Poll aangemaakt.",

            flags: MessageFlags.Ephemeral

        });


    }


};
