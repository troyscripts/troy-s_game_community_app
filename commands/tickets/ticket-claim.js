const { MessageFlags } = require("discord.js");
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const tickets = require("../../database/tickets");

const config = require("../../config/config");



module.exports = {


    data: new SlashCommandBuilder()

        .setName("ticket-claim")

        .setDescription(
            "Claim een ticket."
        ),



    category: "Tickets",


    permissions: [

        "ManageChannels"

    ],


    guildOnly: true,



    async execute(client, interaction) {


        const ticket =
            tickets.getTicket(
                interaction.channel.id
            );



        if (!ticket) {


            return interaction.reply({

                content:
                "❌ Dit kanaal is geen ticket.",

                flags: MessageFlags.Ephemeral

            });


        }



        if (
            ticket.status !== "open"
        ) {


            return interaction.reply({

                content:
                "❌ Dit ticket is gesloten.",

                flags: MessageFlags.Ephemeral

            });


        }



        if (
            ticket.claimed_by
        ) {


            return interaction.reply({

                content:

                `❌ Dit ticket is al geclaimd door <@${ticket.claimed_by}>.`,

                flags: MessageFlags.Ephemeral

            });


        }



        tickets.claimTicket({

            channelId:
            interaction.channel.id,


            staffId:
            interaction.user.id

        });



        const embed =
            new EmbedBuilder()



                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "🎫 Ticket geclaimd"
                )


                .setDescription(

                    `${interaction.user} behandelt vanaf nu dit ticket.`

                )


                .setFooter({

                    text:
                    config.Bot.Footer

                })


                .setTimestamp();



        return interaction.reply({

            embeds:[
                embed
            ]

        });


    }


};