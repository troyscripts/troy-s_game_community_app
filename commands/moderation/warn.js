const { tr, send } = require("../../utils/localization");
const { MessageFlags } = require("../../utils/discord");
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("../../utils/discord");

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


            return send(interaction, "reply", {

                content:
                tr("❌ Je kunt geen bots waarschuwen."),

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
                    tr("⚠️ Waarschuwing gegeven")
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
                        "Moderator",

                        value:
                        `${interaction.user}`,

                        inline:true

                    },


                    {

                        name:
                        tr("Reden"),

                        value:
                        reason

                    },


                    {

                        name:
                        tr("Waarschuwing ID"),

                        value:
                        `${id}`

                    }

                )


                .setFooter({

                    text:
                    config.Bot.Footer

                })


                .setTimestamp();



        await send(interaction, "reply", {

            embeds:[
                embed
            ]

        });



        await send(user, "send", {

            embeds:[

                new EmbedBuilder()

                    .setColor(
                        config.Bot.Color
                    )

                    .setTitle(
                        tr("⚠️ Je hebt een waarschuwing ontvangen")
                    )

                    .setDescription(

                        tr("Server: {0}\n\n", interaction.guild.name) +

                        tr("Reden: {0}", reason)

                    )

                    .setTimestamp()

            ]

        }).catch(() => {});



    }


};
