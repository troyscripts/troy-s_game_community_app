const { tr, send } = require("../../utils/localization");
const { MessageFlags } = require("../../utils/discord");
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("../../utils/discord");

const config =
    require("../../config/config");



module.exports = {


    data: new SlashCommandBuilder()

        .setName("banner")

        .setDescription(
            "Bekijk de Discord banner van een gebruiker."
        )


        .addUserOption(option =>

            option

                .setName("gebruiker")

                .setDescription(
                    "Van welke gebruiker wil je de banner zien?"
                )

                .setRequired(false)

        ),



    category: "Fun",


    guildOnly: false,



    async execute(client, interaction) {

        await interaction.deferReply();


        const userOption =
            interaction.options.getUser(
                "gebruiker"
            );


        let user =
            userOption || interaction.user;



        // Volledige user ophalen zodat banner beschikbaar is
        user =
            await client.users.fetch(
                user.id,
                {
                    force:true
                }
            );



        const banner =
            user.bannerURL({

                size: 4096,

                dynamic:true

            });



        if (!banner) {


            return send(interaction, "editReply", {

                content:
                tr("❌ {0} heeft geen Discord banner.", user.tag),

                flags: MessageFlags.Ephemeral

            });


        }



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    tr("🖼️ Banner van {0}", user.tag)
                )


                .setImage(
                    banner
                )


                .setTimestamp()


                .setFooter({

                    text:
                    config.Bot.Footer

                });



        return send(interaction, "editReply", {

            embeds:[

                embed

            ]

        });


    }


};
