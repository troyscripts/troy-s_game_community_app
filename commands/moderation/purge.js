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

        .setName("purge")

        .setDescription(
            "Verwijder een aantal berichten."
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
                    tr("🧹 Berichten verwijderd")
                )


                .setDescription(

                    tr("{0} berichten zijn verwijderd.", deleted.size)

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



        const reply =
            await send(interaction, "editReply", {

                embeds:[

                    embed

                ]

            });



        setTimeout(() => {


            reply.delete()

                .catch(() => {});


        }, 5000);



    }


};
