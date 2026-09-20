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


            return interaction.reply({

                content:
                "❌ Je kunt geen geld naar jezelf sturen.",

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


            return interaction.reply({

                content:
                "❌ Je hebt niet genoeg geld in je portemonnee.",

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


            return interaction.reply({

                content:
                "❌ De betaling kon niet worden uitgevoerd.",

                flags: MessageFlags.Ephemeral

            });


        }



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "💸 Betaling verzonden"
                )


                .setDescription(

                    `${interaction.user} heeft **€${amount}** gestuurd naar ${target}.`

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
