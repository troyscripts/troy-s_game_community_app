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


            return interaction.reply({

                content:
                "❌ Je hebt geen verjaardag ingesteld.",

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
                    "🗑️ Verjaardag verwijderd"
                )


                .setDescription(

                    `Je verjaardag is succesvol verwijderd uit ${config.Bot.Name}.`

                )


                .setTimestamp()


                .setFooter({

                    text:
                    config.Bot.Footer

                });



        return interaction.reply({

            embeds:[

                embed

            ],

            flags: MessageFlags.Ephemeral

        });


    }


};
