const { tr } = require("../../utils/localization");
const { replyAfterDefer } = require("../../utils/deferredReply");
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

        .setName("deposit")

        .setDescription(
            "Zet geld op je bankrekening."
        )


        .addIntegerOption(option =>

            option

                .setName("bedrag")

                .setDescription(
                    "Hoeveel geld wil je storten?"
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



        let user =
            economy.getBalance(

                userId,

                guildId

            );



        if (!user) {


            economy.createUser(

                userId,

                guildId

            );


            user =
                economy.getBalance(

                    userId,

                    guildId

                );

        }



        if (
            user.wallet < amount
        ) {


            return replyAfterDefer(interaction, {

                content:
                tr("❌ Je hebt niet genoeg geld in je portemonnee."),

                flags: MessageFlags.Ephemeral

            });


        }



        const balance = economy.deposit(userId, guildId, amount);



        if (!balance) {


            return replyAfterDefer(interaction, {

                content:
                tr("❌ De storting kon niet worden uitgevoerd."),

                flags: MessageFlags.Ephemeral

            });


        }



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "🏦 Geld gestort"
                )


                .setDescription(

                    `Je hebt **€${amount}** op je bank gezet.

` +

                    `🏦 Nieuw banksaldo: **€${balance.bank}**`

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
