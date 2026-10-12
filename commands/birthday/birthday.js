const { tr, send } = require("../../utils/localization");
const { MessageFlags } = require("../../utils/discord");
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("../../utils/discord");

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


            return send(interaction, "reply", {

                content:
                tr("❌ {0} heeft nog geen verjaardag ingesteld.", user.username),

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

                    `🎉 De verjaardag van **${user.username}** is:

` +

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



        return send(interaction, "reply", {

            embeds:[

                embed

            ]

        });


    }


};