const {
    EmbedBuilder,
    MessageFlags
} = require("discord.js");

const config =
    require("../config/config");



module.exports = {


    customId: "verify",



    async execute(client, interaction) {


        const verifyRole =
            config.Roles.Verified;



        const role =
            interaction.guild.roles.cache.get(
                verifyRole
            );



        if (!role) {


            return interaction.reply({

                content:
                "❌ De verificatierol bestaat niet.",

                flags: MessageFlags.Ephemeral

            });


        }



        if (
            interaction.member.roles.cache.has(
                verifyRole
            )
        ) {


            return interaction.reply({

                content:
                "✅ Je bent al geverifieerd.",

                flags: MessageFlags.Ephemeral

            });


        }



        await interaction.deferReply({ flags: MessageFlags.Ephemeral });



        await interaction.member.roles.add(
            role
        );

        if (
            config.Roles.NewUser &&
            interaction.member.roles.cache.has(config.Roles.NewUser)
        ) {
            await interaction.member.roles.remove(config.Roles.NewUser).catch(() => {});
        }



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "✅ Verificatie voltooid"
                )


                .setDescription(

                    `Welkom bij **${config.Bot.Name}**!\n\n` +

                    "Je hebt toegang gekregen tot de community kanalen. 🎮"

                )


                .setTimestamp()


                .setFooter({

                    text:
                    config.Bot.Footer

                });



        return interaction.editReply({

            embeds:[

                embed

            ]

        });


    }


};
