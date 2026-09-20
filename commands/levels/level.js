const { MessageFlags } = require("discord.js");
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const levels =
    require("../../database/levels");

const config =
    require("../../config/config");



module.exports = {


    data: new SlashCommandBuilder()

        .setName("level")

        .setDescription(
            "Bekijk het level van een gebruiker."
        )


        .addUserOption(option =>

            option

                .setName("gebruiker")

                .setDescription(
                    "De gebruiker waarvan je het level wilt bekijken."
                )

                .setRequired(true)

        ),



    category: "Levels",


    guildOnly: true,



    async execute(client, interaction) {


        const user =
            interaction.options.getUser(
                "gebruiker"
            );



        const data =
            levels.getLevelUser(

                user.id,

                interaction.guild.id

            );



        if (!data) {


            return interaction.reply({

                content:
                `❌ ${user} heeft nog geen level gegevens.`,

                flags: MessageFlags.Ephemeral

            });


        }



        const neededXP =
            data.level * 100;



        const percentage =
            Math.min(100, Math.max(0, Math.floor(

                (data.xp / neededXP) * 100

            )));



        const progress =
            "🟩".repeat(

                Math.floor(percentage / 10)

            )
            +
            "⬜".repeat(

                10 - Math.floor(percentage / 10)

            );



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "📊 Level informatie"
                )


                .setThumbnail(

                    user.displayAvatarURL({
                        dynamic:true
                    })

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
                        "Level",

                        value:
                        `${data.level}`,

                        inline:true

                    },


                    {

                        name:
                        "XP",

                        value:
                        `${data.xp}/${neededXP}`,

                        inline:true

                    },


                    {

                        name:
                        "Voortgang",

                        value:
                        `${progress} ${percentage}%`

                    },


                    {

                        name:
                        "Berichten",

                        value:
                        `${data.messages}`,

                        inline:true

                    }

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
