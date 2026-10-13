const { tr } = require("../../utils/localization");
const { replyAfterDefer } = require("../../utils/deferredReply");
const { applyRewardBonus, rewardMultiplier } = require("../../services/rewardBonus");
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

        .setName("work")

        .setDescription(
            "Werk om geld te verdienen."
        ),



    category: "Economy",


    guildOnly: true,



    async execute(client, interaction) {

        // Bevestig vóór databasewerk; bij een mislukte bevestiging geen mutaties.
        await interaction.deferReply();


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



                return replyAfterDefer(interaction, {

                    content:
                    tr("⏳ Je moet nog **{0} minuten** wachten voordat je weer kunt werken.", minutes),

                    flags: MessageFlags.Ephemeral

                });


        }



        const jobs = [

            tr("🍔 Je hebt gewerkt bij Burger Shot"),

            tr("🚕 Je hebt mensen rondgereden als taxichauffeur"),

            tr("🔧 Je hebt auto's gerepareerd"),

            tr("📦 Je hebt pakketten bezorgd"),

            tr("🚓 Je hebt geholpen met beveiliging")

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
                    tr("💼 Werk voltooid")
                )


                .setDescription(

                    `${job}\n\n` +

                    tr("💰 Je verdiende **€{0}**", money) +
                    (rewardMultiplier(interaction.member) === 2 ? tr("\n✨ 2× beloning dankzij je VIP- of verjaardagsrol.") : "")

                )


                .setTimestamp()


                .setFooter({

                    text:
                    config.Bot.Footer

                });



        return replyAfterDefer(interaction, {

            embeds:[

                embed

            ]

        });


    }


};
