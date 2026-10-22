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


            return send(interaction, "editReply", {

                content:
                tr("❌ Dit kanaal is geen ticket."),

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

            tr("Niemand");



        const status =
            ticket.status === "open"

            ?

            "🟢 Open"

            :

            tr("🔴 Gesloten");



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    tr("🎫 Ticket informatie")
                )


                .addFields(

                    {

                        name:
                        tr("👤 Ticket eigenaar"),

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
                        tr("📂 Categorie"),

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
                        tr("🛠 Behandelaar"),

                        value:
                        claimed,

                        inline:true

                    },


                    {

                        name:
                        tr("📅 Aangemaakt"),

                        value:
                        `<t:${ticket.created_at}:F>`,

                        inline:false

                    }

                )


                .setFooter({

                    text:
                    config.Bot.Footer

                });



        return send(interaction, "editReply", {

            embeds:[
                embed
            ]

        });


    }


};
