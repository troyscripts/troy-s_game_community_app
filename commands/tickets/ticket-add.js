const { tr, send } = require("../../utils/localization");
const { MessageFlags } = require("../../utils/discord");
const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits
} = require("../../utils/discord");

const tickets = require("../../database/tickets");

const config = require("../../config/config");



module.exports = {


    data: new SlashCommandBuilder()

        .setName("ticket-add")

        .setDescription(
            "Voeg een gebruiker toe aan dit ticket."
        )


        .addUserOption(option =>

            option

                .setName("gebruiker")

                .setDescription(
                    "De gebruiker die toegang krijgt."
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


            return send(interaction, "editReply", {

                content:
                tr("❌ Dit kanaal is geen ticket."),

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


            return send(interaction, "editReply", {

                content:
                tr("❌ Deze gebruiker zit niet op deze server."),

                flags: MessageFlags.Ephemeral

            });


        }



        await interaction.channel.permissionOverwrites.edit(member.id, {

                ViewChannel:true,

                SendMessages:true,

                ReadMessageHistory:true

            });



        const embed =
            new EmbedBuilder()



                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "👤 Gebruiker toegevoegd"
                )


                .setDescription(

                    `${user} heeft toegang gekregen tot dit ticket.`

                )


                .addFields(

                    {

                        name:
                        tr("Toegevoegd door"),

                        value:
                        `${interaction.user}`

                    }

                )


                .setFooter({

                    text:
                    config.Bot.Footer

                })


                .setTimestamp();



        return send(interaction, "editReply", {

            embeds:[
                embed
            ]

        });


    }


};
