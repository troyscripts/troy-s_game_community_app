const { MessageFlags } = require("discord.js");
const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require("discord.js");

const tickets = require("../../database/tickets");

const config = require("../../config/config");



module.exports = {


    data: new SlashCommandBuilder()

        .setName("ticket-remove")

        .setDescription(
            "Verwijder een gebruiker uit dit ticket."
        )


        .addUserOption(option =>

            option

                .setName("gebruiker")

                .setDescription(
                    "De gebruiker die verwijderd moet worden."
                )

                .setRequired(true)

        ),



    category: "Tickets",


    permissions: [

        "ManageChannels"

    ],


    guildOnly: true,



    async execute(client, interaction) {


        await interaction.deferReply();


        const ticket =
            tickets.getTicket(
                interaction.channel.id
            );



        if (!ticket) {


            return interaction.editReply({

                content:
                "❌ Dit kanaal is geen ticket.",

                flags: MessageFlags.Ephemeral

            });


        }



        const user =
            interaction.options.getUser(
                "gebruiker"
            );



        const member =
            await interaction.guild.members.fetch(
                user.id
            ).catch(() => null);



        if (!member) {


            return interaction.editReply({

                content:
                "❌ Deze gebruiker zit niet op deze server.",

                flags: MessageFlags.Ephemeral

            });


        }



        if (
            !interaction.channel
                .permissionsFor(member)
                .has(
                    PermissionFlagsBits.ViewChannel
                )
        ) {


            return interaction.editReply({

                content:
                "❌ Deze gebruiker heeft geen toegang tot dit ticket.",

                flags: MessageFlags.Ephemeral

            });


        }



        await interaction.channel.permissionOverwrites.delete(
            member.id
        );



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "🎫 Gebruiker verwijderd"
                )


                .setDescription(

                    `${user} is verwijderd uit dit ticket.`

                )


                .addFields({

                    name:
                    "Uitgevoerd door",

                    value:
                    `${interaction.user}`

                })


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
