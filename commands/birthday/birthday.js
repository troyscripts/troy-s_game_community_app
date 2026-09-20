const { MessageFlags } = require("discord.js");
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const config =
    require("../../config/config");

const birthday =
    require("../../database/birthday");



module.exports = {


    data: new SlashCommandBuilder()

        .setName("birthday")

        .setDescription(
            "Bekijk de verjaardag van een gebruiker."
        )


        .addUserOption(option =>

            option

                .setName("gebruiker")

                .setDescription(
                    "Van wie wil je de verjaardag bekijken?"
                )

                .setRequired(false)

        ),



    category: "Birthday",


    guildOnly: true,



    async execute(client, interaction) {


        const user =
            interaction.options.getUser(
                "gebruiker"
            )
            ||
            interaction.user;



        const data =
            birthday.getBirthday(

                user.id,

                interaction.guild.id

            );



        if (!data) {


            return interaction.reply({

                content:
                `❌ ${user.username} heeft nog geen verjaardag ingesteld.`,

                flags: MessageFlags.Ephemeral

            });


        }



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "🎂 Verjaardag"
                )


                .setDescription(

                    `🎉 De verjaardag van **${user.username}** is:\n\n` +

                    `📅 **${data.birthday}**`

                )


                .setThumbnail(

                    user.displayAvatarURL({

                        dynamic:true

                    })

                )


                .setTimestamp()


                .setFooter({

                    text:
                    config.Bot.Footer

                });



        return interaction.reply({

            embeds:[

                embed

            ]

        });


    }


};