const { MessageFlags } = require("discord.js");
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

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


            return interaction.editReply({

                content:
                `❌ ${user.tag} heeft geen Discord banner.`,

                flags: MessageFlags.Ephemeral

            });


        }



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    `🖼️ Banner van ${user.tag}`
                )


                .setImage(
                    banner
                )


                .setTimestamp()


                .setFooter({

                    text:
                    config.Bot.Footer

                });



        return interaction.editReply({

            embeds:[

                embed

            ]

        });


    }


};
