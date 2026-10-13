const { tr, send, sendLogMessage } = require("../utils/localization");
const { MessageFlags } = require("../utils/discord");
const {
    EmbedBuilder
} = require("../utils/discord");

const config =
    require("../config/config");

const ticketDB =
    require("../database/tickets");

const { hasStaffRole } =
    require("../utils/permissions");



module.exports = {


    customId: "ticket-claim",



    async execute(client, interaction) {


        const hasPermission = hasStaffRole(interaction.member);



        if (!hasPermission) {


            return send(interaction, "reply", {

                content:
                tr("❌ Je hebt geen toestemming om tickets te claimen."),

                flags: MessageFlags.Ephemeral

            });


        }



        const ticket =
            ticketDB.getTicket(

                interaction.channel.id

            );



        if (!ticket) {


            return send(interaction, "reply", {

                content:
                tr("❌ Dit kanaal is geen ticket."),

                flags: MessageFlags.Ephemeral

            });


        }



        if (ticket.claimed_by) {


            return send(interaction, "reply", {

                content:
                tr("❌ Dit ticket is al geclaimd door <@{0}>.", ticket.claimed_by),

                flags: MessageFlags.Ephemeral

            });


        }



        ticketDB.claimTicket({
            channelId: interaction.channel.id,
            staffId: interaction.user.id
        });



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    tr("🎫 Ticket geclaimd")
                )


                .setDescription(

                    tr("Dit ticket wordt nu behandeld door {0}.", interaction.user)

                )


                .setTimestamp()


                .setFooter({

                    text:
                    config.Bot.Footer

                });



        await send(interaction, "reply", {

            embeds:[

                embed

            ]

        });



        const logChannel =
            interaction.guild.channels.cache.get(

                config.Tickets.LogChannel

            );



        if (logChannel) {


            const logEmbed =
                new EmbedBuilder()


                    .setColor(
                        config.Bot.Color
                    )


                    .setTitle(
                        "🎫 Ticket Claim"
                    )


                    .setDescription(

                        `**Ticket:** ${interaction.channel}\n` +

                        `**Staff:** ${interaction.user}\n` +

                        tr("**Eigenaar:** <@{0}>", ticket.user_id)

                    )


                    .setTimestamp();


            sendLogMessage(logChannel, "send", {

                embeds:[

                    logEmbed

                ]

            });


        }


    }


};
