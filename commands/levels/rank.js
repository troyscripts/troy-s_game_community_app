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

        .setName("rank")

        .setDescription(
            "Bekijk je level en XP."
        )


        .addUserOption(option =>

            option

                .setName("gebruiker")

                .setDescription(
                    "Bekijk het level van iemand anders."
                )

                .setRequired(false)

        ),



    category: "Levels",


    guildOnly: true,



    async execute(client, interaction) {


        const target =
            interaction.options.getUser(
                "gebruiker"
            ) || interaction.user;



        const user =
            levels.getLevelUser(

                target.id,

                interaction.guild.id

            );



        if (!user) {


            return send(interaction, "reply", {

                content:
                tr("❌ {0} heeft nog geen XP.", target),

                flags: MessageFlags.Ephemeral

            });


        }



        const requiredXP =
            user.level * 100;



        const percentage =
            Math.min(100, Math.max(0, Math.floor(

                (user.xp / requiredXP) * 100

            )));



        const filled =
            Math.floor(

                percentage / 10

            );



        const progress =
            "🟩".repeat(filled) +

            "⬜".repeat(10 - filled);



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "🏆 Rank"
                )


                .setThumbnail(
                    target.displayAvatarURL({
                        dynamic:true
                    })
                )


                .addFields(

                    {

                        name:
                        tr("Gebruiker"),

                        value:
                        `${target}`,

                        inline:true

                    },


                    {

                        name:
                        "Level",

                        value:
                        `${user.level}`,

                        inline:true

                    },


                    {

                        name:
                        "XP",

                        value:
                        `${user.xp} / ${requiredXP}`,

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
                        `${user.messages}`,

                        inline:true

                    }

                )


                .setFooter({

                    text:
                    config.Bot.Footer

                })


                .setTimestamp();



        return send(interaction, "reply", {

            embeds:[

                embed

            ]

        });


    }


};
