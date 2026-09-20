const { MessageFlags } = require("discord.js");
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const tickets = require("../../database/tickets");

const config = require("../../config/config");



module.exports = {


    data: new SlashCommandBuilder()

        .setName("ticket-info")

        .setDescription(
            "Bekijk informatie over dit ticket."
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



        const member =
            await interaction.guild.members.fetch(
                ticket.user_id
            ).catch(() => null);



        const claimed =
            ticket.claimed_by

            ?

            `<@${ticket.claimed_by}>`

            :

            "Niemand";



        const status =
            ticket.status === "open"

            ?

            "🟢 Open"

            :

            "🔴 Gesloten";



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "🎫 Ticket informatie"
                )


                .addFields(

                    {

                        name:
                        "👤 Ticket eigenaar",

                        value:
                        member
                        ?

                        `${member}`

                        :

                        `<@${ticket.user_id}>`,

                        inline:true

                    },


                    {

                        name:
                        "📂 Categorie",

                        value:
                        ticket.category || "Support",

                        inline:true

                    },


                    {

                        name:
                        "📌 Status",

                        value:
                        status,

                        inline:true

                    },


                    {

                        name:
                        "🛠 Behandelaar",

                        value:
                        claimed,

                        inline:true

                    },


                    {

                        name:
                        "📅 Aangemaakt",

                        value:
                        `<t:${ticket.created_at}:F>`,

                        inline:false

                    }

                )


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
