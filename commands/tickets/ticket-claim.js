const { tr, send } = require("../../utils/localization");
const { MessageFlags } = require("../../utils/discord");
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("../../utils/discord");

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


            return send(interaction, "reply", {

                content:
                tr("❌ Dit kanaal is geen ticket."),

                flags: MessageFlags.Ephemeral

            });


        }



        if (
            ticket.status !== "open"
        ) {


            return send(interaction, "reply", {

                content:
                tr("❌ Dit ticket is gesloten."),

                flags: MessageFlags.Ephemeral

            });


        }



        if (
            ticket.claimed_by
        ) {


            return send(interaction, "reply", {

                content:

                tr("❌ Dit ticket is al geclaimd door <@{0}>.", ticket.claimed_by),

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



        return send(interaction, "reply", {

            embeds:[
                embed
            ]

        });


    }


};