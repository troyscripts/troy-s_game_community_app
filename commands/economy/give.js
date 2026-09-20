const { MessageFlags } = require("discord.js");
const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits
} = require("discord.js");

const config =
    require("../../config/config");

const economy =
    require("../../database/economy");

const { isOwner } =
    require("../../utils/permissions");



module.exports = {


    data: new SlashCommandBuilder()

        .setName("give")

        .setDescription(
            "Geef een gebruiker geld."
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
                    "Hoeveel geld moet erbij?"
                )

                .setRequired(true)

                .setMinValue(1)

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
                "❌ Je hebt geen toestemming om geld te geven.",

                flags: MessageFlags.Ephemeral

            });


        }



        const target =
            interaction.options.getUser(
                "gebruiker"
            );



        const amount =
            interaction.options.getInteger(
                "bedrag"
            );



        const guildId =
            interaction.guild.id;



        economy.addWallet(

            target.id,

            guildId,

            amount

        );



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "💰 Geld toegevoegd"
                )


                .setDescription(

                    `${interaction.user} heeft **€${amount}** gegeven aan ${target}.`

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
