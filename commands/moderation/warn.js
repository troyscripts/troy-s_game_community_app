const { MessageFlags } = require("discord.js");
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const warnings =
    require("../../database/warnings");

const config =
    require("../../config/config");



module.exports = {


    data: new SlashCommandBuilder()

        .setName("warn")

        .setDescription(
            "Geef een waarschuwing aan een gebruiker."
        )


        .addUserOption(option =>

            option

                .setName("gebruiker")

                .setDescription(
                    "De gebruiker die je wilt waarschuwen."
                )

                .setRequired(true)

        )


        .addStringOption(option =>

            option

                .setName("reden")

                .setDescription(
                    "Reden van de waarschuwing."
                )

                .setRequired(true)

        ),



    category: "Moderation",


    permissions: [

        "ManageMessages"

    ],


    guildOnly: true,



    async execute(client, interaction) {


        const user =
            interaction.options.getUser(
                "gebruiker"
            );


        const reason =
            interaction.options.getString(
                "reden"
            );



        if (
            user.bot
        ) {


            return interaction.reply({

                content:
                "❌ Je kunt geen bots waarschuwen.",

                flags: MessageFlags.Ephemeral

            });


        }



        const id = warnings.addWarning({
            userId: user.id,
            guildId: interaction.guild.id,
            moderatorId: interaction.user.id,
            reason
        });



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "⚠️ Waarschuwing gegeven"
                )


                .addFields(

                    {

                        name:
                        "Gebruiker",

                        value:
                        `${user}`,

                        inline:true

                    },


                    {

                        name:
                        "Moderator",

                        value:
                        `${interaction.user}`,

                        inline:true

                    },


                    {

                        name:
                        "Reden",

                        value:
                        reason

                    },


                    {

                        name:
                        "Waarschuwing ID",

                        value:
                        `${id}`

                    }

                )


                .setFooter({

                    text:
                    config.Bot.Footer

                })


                .setTimestamp();



        await interaction.reply({

            embeds:[
                embed
            ]

        });



        await user.send({

            embeds:[

                new EmbedBuilder()

                    .setColor(
                        config.Bot.Color
                    )

                    .setTitle(
                        "⚠️ Je hebt een waarschuwing ontvangen"
                    )

                    .setDescription(

                        `Server: ${interaction.guild.name}\n\n` +

                        `Reden: ${reason}`

                    )

                    .setTimestamp()

            ]

        }).catch(() => {});



    }


};
