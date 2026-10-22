const { tr, send } = require("../../utils/localization");
const { MessageFlags } = require("../../utils/discord");
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("../../utils/discord");

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


            return send(interaction, "reply", {

                content:
                tr("❌ {0} heeft nog geen level gegevens.", user),

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
                    tr("📊 Level informatie")
                )


                .setThumbnail(

                    user.displayAvatarURL({
                        dynamic:true
                    })

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
                        tr("Voortgang"),

                        value:
                        `${progress} ${percentage}%`

                    },


                    {

                        name:
                        tr("Berichten"),

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



        return send(interaction, "reply", {

            embeds:[

                embed

            ]

        });


    }


};
