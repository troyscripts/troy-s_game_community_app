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

        .setName("work")

        .setDescription(
            "Werk om geld te verdienen."
        ),



    category: "Economy",


    guildOnly: true,



    async execute(client, interaction) {


        const userId =
            interaction.user.id;


        const guildId =
            interaction.guild.id;



        const cooldownTime =
            (Number(config.Economy.WorkCooldownMinutes) || 60) * 60 * 1000;



        const economyUser = economy.getOrCreate(userId, guildId);
        const remaining = economyUser.last_work + cooldownTime - Date.now();

        if (remaining > 0) {


                const minutes =
                    Math.ceil(
                        remaining / 60000
                    );



                return interaction.reply({

                    content:
                    `⏳ Je moet nog **${minutes} minuten** wachten voordat je weer kunt werken.`,

                    flags: MessageFlags.Ephemeral

                });


        }



        const jobs = [

            "🍔 Je hebt gewerkt bij Burger Shot",

            "🚕 Je hebt mensen rondgereden als taxichauffeur",

            "🔧 Je hebt auto's gerepareerd",

            "📦 Je hebt pakketten bezorgd",

            "🚓 Je hebt geholpen met beveiliging"

        ];



        const job =
            jobs[
                Math.floor(
                    Math.random() * jobs.length
                )
            ];



        const money = applyRewardBonus(Math.floor(Math.random() * 451) + 50, interaction.member);



        economy.addMoney(

            userId,

            guildId,

            money

        );



        economy.setLastWork(userId, guildId, Date.now());



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "💼 Werk voltooid"
                )


                .setDescription(

                    `${job}\n\n` +

                    `💰 Je verdiende **€${money}**` +
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
