const { tr, send } = require("../../utils/localization");
const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags
} = require("../../utils/discord");

const config =
    require("../../config/config");



module.exports = {


    data: new SlashCommandBuilder()

        .setName("clear")

        .setDescription(
            "Verwijder berichten uit een kanaal."
        )


        .addIntegerOption(option =>

            option

                .setName("aantal")

                .setDescription(
                    "Aantal berichten om te verwijderen."
                )

                .setRequired(true)

                .setMinValue(1)

                .setMaxValue(100)

        ),



    category: "Moderation",


    permissions: [

        "ManageMessages"

    ],


    guildOnly: true,



    async execute(client, interaction) {

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });


        const amount =
            interaction.options.getInteger(
                "aantal"
            );



        const messages =
            await interaction.channel.messages.fetch({

                limit: amount

            });



        const deleted =
            await interaction.channel.bulkDelete(

                messages,

                true

            );



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "🧹 Chat opgeschoond"
                )


                .setDescription(

                    `Er zijn **${deleted.size}** berichten verwijderd.`

                )


                .addFields({

                    name:
                    tr("Uitgevoerd door"),

                    value:
                    `${interaction.user}`

                })


                .setTimestamp()


                .setFooter({

                    text:
                    config.Bot.Footer

                });



        const message =
            await send(interaction, "editReply", {

                embeds:[

                    embed

                ]

            });



        setTimeout(() => {


            message.delete()

                .catch(() => {});


        }, 5000);



    }


};
