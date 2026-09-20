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

        .setName("balance")

        .setDescription(
            "Bekijk je saldo."
        )


        .addUserOption(option =>

            option

                .setName("gebruiker")

                .setDescription(
                    "Bekijk het saldo van iemand anders."
                )

                .setRequired(false)

        ),



    category: "Economy",


    guildOnly: true,



    async execute(client, interaction) {


        const target =
            interaction.options.getUser(
                "gebruiker"
            )
            ||
            interaction.user;



        const guildId =
            interaction.guild.id;



        let user =
            economy.getBalance(

                target.id,

                guildId

            );



        if (!user) {


            economy.createUser(

                target.id,

                guildId

            );



            user =
                economy.getBalance(

                    target.id,

                    guildId

                );

        }



        const total =
            user.wallet +
            user.bank;



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    `💰 Saldo van ${target.username}`
                )


                .setDescription(

                    `💵 Portemonnee: **€${user.wallet}**\n` +

                    `🏦 Bank: **€${user.bank}**\n\n` +

                    `💎 Totaal vermogen: **€${total}**`

                )


                .setThumbnail(

                    target.displayAvatarURL({

                        dynamic:true

                    })

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