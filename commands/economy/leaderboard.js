const { tr, send } = require("../../utils/localization");
const { MessageFlags } = require("../../utils/discord");
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("../../utils/discord");

const config =
    require("../../config/config");

const economy =
    require("../../database/economy");



module.exports = {


    data: new SlashCommandBuilder()

        .setName("economy-leaderboard")

        .setDescription(
            "Bekijk de rijkste gebruikers."
        ),



    category: "Economy",


    guildOnly: true,



    async execute(client, interaction) {


        await interaction.deferReply();


        const users =
            economy.getLeaderboard(

                interaction.guild.id,

                10

            );



        if (!users || users.length === 0) {


            return send(interaction, "editReply", {

                content:
                tr("❌ Er zijn nog geen economie gegevens."),

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



            const total =
                userData.wallet +
                userData.bank;



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

                tr("💰 Totaal: **€{0}**\n", total) +

                `💵 Wallet: €${userData.wallet} | 🏦 Bank: €${userData.bank}\n\n`;


        }



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "🏆 Economy Leaderboard"
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
