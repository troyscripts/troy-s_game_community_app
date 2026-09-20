const { MessageFlags } = require("discord.js");
const {
    EmbedBuilder
} = require("discord.js");

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


            return interaction.reply({

                content:
                "❌ Je hebt geen toestemming om tickets te claimen.",

                flags: MessageFlags.Ephemeral

            });


        }



        const ticket =
            ticketDB.getTicket(

                interaction.channel.id

            );



        if (!ticket) {


            return interaction.reply({

                content:
                "❌ Dit kanaal is geen ticket.",

                flags: MessageFlags.Ephemeral

            });


        }



        if (ticket.claimed_by) {


            return interaction.reply({

                content:
                `❌ Dit ticket is al geclaimd door <@${ticket.claimed_by}>.`,

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
                    "🎫 Ticket geclaimd"
                )


                .setDescription(

                    `Dit ticket wordt nu behandeld door ${interaction.user}.`

                )


                .setTimestamp()


                .setFooter({

                    text:
                    config.Bot.Footer

                });



        await interaction.reply({

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

                        `**Eigenaar:** <@${ticket.user_id}>`

                    )


                    .setTimestamp();


            logChannel.send({

                embeds:[

                    logEmbed

                ]

            });


        }


    }


};
