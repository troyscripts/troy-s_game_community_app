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

        .setName("pay")

        .setDescription(
            "Stuur geld naar een andere gebruiker."
        )


        .addUserOption(option =>

            option

                .setName("gebruiker")

                .setDescription(
                    "Wie krijgt het geld?"
                )

                .setRequired(true)

        )


        .addIntegerOption(option =>

            option

                .setName("bedrag")

                .setDescription(
                    "Hoeveel geld wil je sturen?"
                )

                .setRequired(true)

                .setMinValue(1)

        ),



    category: "Economy",


    guildOnly: true,



    async execute(client, interaction) {

        // Bevestig vóór databasewerk; bij een mislukte bevestiging geen mutaties.
        await interaction.deferReply();


        const target =
            interaction.options.getUser(
                "gebruiker"
            );


        const amount =
            interaction.options.getInteger(
                "bedrag"
            );



        const senderId =
            interaction.user.id;


        const receiverId =
            target.id;


        const guildId =
            interaction.guild.id;



        if (
            senderId === receiverId
        ) {


            return replyAfterDefer(interaction, {

                content:
                tr("❌ Je kunt geen geld naar jezelf sturen."),

                flags: MessageFlags.Ephemeral

            });


        }



        const sender =
            economy.getBalance(

                senderId,

                guildId

            );



        if (!sender) {


            economy.createUser(

                senderId,

                guildId

            );


        }



        const senderBalance =
            economy.getBalance(

                senderId,

                guildId

            );



        if (
            senderBalance.wallet < amount
        ) {


            return replyAfterDefer(interaction, {

                content:
                tr("❌ Je hebt niet genoeg geld in je portemonnee."),

                flags: MessageFlags.Ephemeral

            });


        }



        const transferred = economy.transferWallet(

            senderId,

            receiverId,

            guildId,

            amount

        );



        if (!transferred) {


            return replyAfterDefer(interaction, {

                content:
                tr("❌ De betaling kon niet worden uitgevoerd."),

                flags: MessageFlags.Ephemeral

            });


        }



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    tr("💸 Betaling verzonden")
                )


                .setDescription(

                    tr("{0} heeft **€{1}** gestuurd naar {2}.", interaction.user, amount, target)

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
