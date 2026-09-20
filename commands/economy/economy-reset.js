const { MessageFlags } = require("discord.js");
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const config =
    require("../../config/config");

const economy =
    require("../../database/economy");

const { isOwner } =
    require("../../utils/permissions");



module.exports = {


    data: new SlashCommandBuilder()

        .setName("economy-reset")

        .setDescription(
            "Reset de economie van een gebruiker."
        )


        .addUserOption(option =>

            option

                .setName("gebruiker")

                .setDescription(
                    "Welke gebruiker moet worden gereset?"
                )

                .setRequired(true)

        ),



    category: "Economy",


    guildOnly: true,



    async execute(client, interaction) {


        const allowedRoles = [

            config.Roles.Owner,

            config.Roles.HeadAdmin,

            config.Roles.Admin

        ];



        const hasPermission =
            isOwner(interaction.user.id) ||
            interaction.member.roles.cache.some(

                role =>

                allowedRoles.includes(
                    role.id
                )

            );



        if (!hasPermission) {


            return interaction.reply({

                content:
                "❌ Je hebt geen toestemming om economie te resetten.",

                flags: MessageFlags.Ephemeral

            });


        }



        const target =
            interaction.options.getUser(
                "gebruiker"
            );



        const guildId =
            interaction.guild.id;



        economy.setMoney(

            target.id,

            guildId,

            0,

            0

        );



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "♻️ Economy gereset"
                )


                .setDescription(

                    `${interaction.user} heeft de economie van ${target} gereset.\n\n` +

                    "💵 Wallet: **€0**\n" +

                    "🏦 Bank: **€0**"

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
