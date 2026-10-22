const { tr, send } = require("../../utils/localization");
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("../../utils/discord");

const levels =
    require("../../database/levels");

const config =
    require("../../config/config");



module.exports = {


    data: new SlashCommandBuilder()

        .setName("resetxp")

        .setDescription(
            "Reset de XP van een gebruiker."
        )


        .addUserOption(option =>

            option

                .setName("gebruiker")

                .setDescription(
                    "De gebruiker waarvan je XP wilt resetten."
                )

                .setRequired(true)

        ),



    category: "Levels",


    permissions: [

        "ManageGuild"

    ],


    guildOnly: true,



    async execute(client, interaction) {


        const user =
            interaction.options.getUser(
                "gebruiker"
            );



        levels.resetXP(

            user.id,

            interaction.guild.id

        );



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    tr("🔄 XP gereset")
                )


                .addFields(

                    {

                        name:
                        tr("Gebruiker"),

                        value:
                        `${user}`,

                        inline:true

                    },


                    {

                        name:
                        tr("Uitgevoerd door"),

                        value:
                        `${interaction.user}`,

                        inline:true

                    },


                    {

                        name:
                        tr("Nieuwe status"),

                        value:
                        tr("Level 1\nXP 0\nBerichten 0")

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