const { MessageFlags } = require("discord.js");
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const config =
    require("../../config/config");



module.exports = {


    data: new SlashCommandBuilder()

        .setName("timeout")

        .setDescription(
            "Geef een gebruiker een timeout."
        )


        .addUserOption(option =>

            option

                .setName("gebruiker")

                .setDescription(
                    "De gebruiker die een timeout krijgt."
                )

                .setRequired(true)

        )


        .addIntegerOption(option =>

            option

                .setName("duur")

                .setDescription(
                    "Aantal minuten timeout."
                )

                .setRequired(true)

                .setMinValue(1)

                .setMaxValue(40320)

        )


        .addStringOption(option =>

            option

                .setName("reden")

                .setDescription(
                    "Reden van de timeout."
                )

                .setRequired(true)

        ),



    category: "Moderation",


    permissions: [

        "ModerateMembers"

    ],


    guildOnly: true,



    async execute(client, interaction) {

        await interaction.deferReply();


        const user =
            interaction.options.getUser(
                "gebruiker"
            );


        const duration =
            interaction.options.getInteger(
                "duur"
            );


        const reason =
            interaction.options.getString(
                "reden"
            );



        const member =
            await interaction.guild.members.fetch(
                user.id
            ).catch(() => null);



        if (!member) {


            return interaction.editReply({

                content:
                "❌ Deze gebruiker zit niet op de server.",

                flags: MessageFlags.Ephemeral

            });


        }



        if (
            member.id === interaction.user.id
        ) {


            return interaction.editReply({

                content:
                "❌ Je kunt jezelf geen timeout geven.",

                flags: MessageFlags.Ephemeral

            });


        }



        if (
            member.communicationDisabledUntil
        ) {


            return interaction.editReply({

                content:
                "❌ Deze gebruiker heeft al een timeout.",

                flags: MessageFlags.Ephemeral

            });


        }



        if (
            !member.moderatable ||
            member.roles.highest.position >= interaction.member.roles.highest.position
        ) {


            return interaction.editReply({

                content:
                "❌ Je kunt deze gebruiker niet modereren. Controleer de rollenhiërarchie van jou en de bot."

            });


        }



        await member.timeout(

            duration * 60 * 1000,

            `${reason} | Door: ${interaction.user.tag}`

        );



        const embed =
            new EmbedBuilder()



                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "🔇 Timeout gegeven"
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
                        "Duur",

                        value:
                        `${duration} minuten`,

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
                        "Moderator",

                        value:
                        `${interaction.user}`

                    }

                )


                .setTimestamp()


                .setFooter({

                    text:
                    config.Bot.Footer

                });



        await interaction.editReply({

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
                        "🔇 Je hebt een timeout ontvangen"
                    )

                    .setDescription(

                        `Server: ${interaction.guild.name}\n\n` +

                        `Duur: ${duration} minuten\n` +

                        `Reden: ${reason}`

                    )

                    .setTimestamp()

            ]

        }).catch(() => {});



    }


};
