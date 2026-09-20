const { applyRewardBonus, rewardMultiplier } = require("../../services/rewardBonus");
const { MessageFlags } = require("discord.js");
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const config =
    require("../../config/config");

const economy =
    require("../../database/economy");


module.exports = {


    data: new SlashCommandBuilder()

        .setName("daily")

        .setDescription(
            "Claim je dagelijkse beloning."
        ),



    category: "Economy",


    guildOnly: true,



    async execute(client, interaction) {


        const userId =
            interaction.user.id;


        const guildId =
            interaction.guild.id;



        const cooldownTime =
            (Number(config.Economy.DailyCooldownHours) || 24) * 60 * 60 * 1000;



        const economyUser = economy.getOrCreate(userId, guildId);
        const remaining = economyUser.last_daily + cooldownTime - Date.now();

        if (remaining > 0) {


                const hours =
                    Math.floor(
                        remaining / 3600000
                    );


                const minutes =
                    Math.ceil(

                        (remaining % 3600000) / 60000

                    );



                return interaction.reply({

                    content:
                    `⏳ Je hebt je daily reward al gebruikt.\nProbeer opnieuw over **${hours} uur en ${minutes} minuten**.`,

                    flags: MessageFlags.Ephemeral

                });


        }



        const reward = applyRewardBonus(Math.floor(Math.random() * 501) + 500, interaction.member);



        economy.addWallet(

            userId,

            guildId,

            reward

        );



        economy.setLastDaily(userId, guildId, Date.now());



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "🎁 Daily Reward"
                )


                .setDescription(

                    `Je hebt je dagelijkse beloning ontvangen!\n\n` +

                    `💰 Je kreeg **€${reward}**` +
                    (rewardMultiplier(interaction.member) === 2 ? "\n✨ 2× beloning dankzij je VIP- of verjaardagsrol." : "")

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
