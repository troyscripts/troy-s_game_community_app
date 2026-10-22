const { tr, send } = require("../../utils/localization");
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder
} = require("../../utils/discord");

const config =
    require("../../config/config");



module.exports = {


    data: new SlashCommandBuilder()

        .setName("avatar")

        .setDescription(
            "Bekijk de avatar van een gebruiker."
        )


        .addUserOption(option =>

            option

                .setName("gebruiker")

                .setDescription(
                    "Van welke gebruiker wil je de avatar zien?"
                )

                .setRequired(false)

        ),



    category: "Fun",


    guildOnly: false,



    async execute(client, interaction) {


        const user =
            interaction.options.getUser(
                "gebruiker"
            )
            ||
            interaction.user;



        const avatar =
            user.displayAvatarURL({

                size: 4096,

                dynamic:true

            });



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    tr("🖼️ Avatar van {0}", user.tag)
                )


                .setImage(
                    avatar
                )


                .setTimestamp()


                .setFooter({

                    text:
                    config.Bot.Footer

                });



        const button =
            new ButtonBuilder()

                .setLabel(
                    tr("Open afbeelding")
                )

                .setStyle(
                    ButtonStyle.Link
                )

                .setURL(
                    avatar
                );



        const row =
            new ActionRowBuilder()

                .addComponents(

                    button

                );



        return send(interaction, "reply", {

            embeds:[

                embed

            ],

            components:[

                row

            ]

        });


    }


};