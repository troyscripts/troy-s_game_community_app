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

        .setName("removebirthday")

        .setDescription(
            "Verwijder je opgeslagen verjaardag."
        ),



    category: "Birthday",


    guildOnly: true,



    async execute(client, interaction) {


        const existing =
            birthday.getBirthday(

                interaction.user.id,

                interaction.guild.id

            );



        if (!existing) {


            return send(interaction, "reply", {

                content:
                tr("❌ Je hebt geen verjaardag ingesteld."),

                flags: MessageFlags.Ephemeral

            });


        }



        birthday.removeBirthday(

            interaction.user.id,

            interaction.guild.id

        );



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    tr("🗑️ Verjaardag verwijderd")
                )


                .setDescription(

                    tr("Je verjaardag is succesvol verwijderd uit {0}.", config.Bot.Name)

                )


                .setTimestamp()


                .setFooter({

                    text:
                    config.Bot.Footer

                });



        return send(interaction, "reply", {

            embeds:[

                embed

            ],

            flags: MessageFlags.Ephemeral

        });


    }


};
