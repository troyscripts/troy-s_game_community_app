const { replyAfterDefer } = require("../../utils/deferredReply");
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

        .setName("withdraw")

        .setDescription(
            "Neem geld op van je bank."
        )


        .addIntegerOption(option =>

            option

                .setName("bedrag")

                .setDescription(
                    "Hoeveel geld wil je opnemen?"
                )

                .setRequired(true)

                .setMinValue(1)

        ),



    category: "Economy",


    guildOnly: true,



    async execute(client, interaction) {

        // Bevestig vóór databasewerk; bij een mislukte bevestiging geen mutaties.
        await interaction.deferReply();


        const amount =
            interaction.options.getInteger(
                "bedrag"
            );



        const userId =
            interaction.user.id;


        const guildId =
            interaction.guild.id;



        const user =
            economy.getBalance(

                userId,

                guildId

            );



        if (!user) {


            economy.createUser(

                userId,

                guildId

            );


        }



        const balance =
            economy.getBalance(

                userId,

                guildId

            );



        if (
            balance.bank < amount
        ) {


            return replyAfterDefer(interaction, {

                content:
                "❌ Je hebt niet genoeg geld op je bank.",

                flags: MessageFlags.Ephemeral

            });


        }



        const updatedBalance = economy.withdraw(userId, guildId, amount);



        if (!updatedBalance) {


            return replyAfterDefer(interaction, {

                content:
                "❌ De opname kon niet worden uitgevoerd.",

                flags: MessageFlags.Ephemeral

            });


        }



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "🏧 Geld opgenomen"
                )


                .setDescription(

                    `Je hebt **€${amount}** opgenomen van je bank.\n\n` +

                    `💵 Portemonnee: **€${updatedBalance.wallet}**`

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
