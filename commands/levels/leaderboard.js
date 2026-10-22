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

        .setName("leaderboard")

        .setDescription(
            "Bekijk de level ranglijst."
        ),



    category: "Levels",


    guildOnly: true,



    async execute(client, interaction) {


        await interaction.deferReply();


        const users =
            levels.getLeaderboard(

                interaction.guild.id,

                10

            );



        if (!users.length) {


            return send(interaction, "editReply", {

                content:
                tr("❌ Er zijn nog geen level gegevens."),

                flags: MessageFlags.Ephemeral

            });


        }



        let description = "";



        for (
            let i = 0;
            i < users.length;
            i++
        ) {


            const userData =
                users[i];


            const member =
                await interaction.guild.members.fetch(

                    userData.user_id

                ).catch(() => null);



            const username =
                member
                    ? member.user.username
                    : tr("Onbekende gebruiker");



            let medal;



            if (i === 0)
                medal = "🥇";

            else if (i === 1)
                medal = "🥈";

            else if (i === 2)
                medal = "🥉";

            else
                medal = `**${i + 1}.**`;



            description +=

                `${medal} ${username}\n` +

                `⭐ Level: **${userData.level}** | ` +

                `XP: **${userData.xp}**\n\n`;


        }



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "🏆 Level Leaderboard"
                )


                .setDescription(

                    description

                )


                .setTimestamp()


                .setFooter({

                    text:
                    config.Bot.Footer

                });



        return send(interaction, "editReply", {

            embeds:[

                embed

            ]

        });


    }


};
