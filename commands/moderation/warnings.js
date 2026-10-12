const { tr, send } = require("../../utils/localization");
const { MessageFlags } = require("../../utils/discord");
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("../../utils/discord");

const warnings =
    require("../../database/warnings");

const config =
    require("../../config/config");



module.exports = {


    data: new SlashCommandBuilder()

        .setName("warnings")

        .setDescription(
            "Bekijk de waarschuwingen van een gebruiker."
        )


        .addUserOption(option =>

            option

                .setName("gebruiker")

                .setDescription(
                    "De gebruiker waarvan je waarschuwingen wilt zien."
                )

                .setRequired(true)

        ),



    category: "Moderation",


    permissions: [

        "ManageMessages"

    ],


    guildOnly: true,



    async execute(client, interaction) {


        const user =
            interaction.options.getUser(
                "gebruiker"
            );



        const list =
            warnings.getWarnings(

                user.id,

                interaction.guild.id

            );



        if (
            !list ||
            list.length === 0
        ) {


            return send(interaction, "reply", {

                content:
                tr("✅ {0} heeft geen waarschuwingen.", user),

                flags: MessageFlags.Ephemeral

            });


        }



        const warningText =
            list.map((warning, index) => {


                return (

                    `**${index + 1}.** ${warning.reason}\n` +

                    `👮 Moderator: <@${warning.moderator_id}>\n` +

                    `📅 <t:${warning.created_at}:F>`

                );


            })

            .join("\n\n");



        const embed =
            new EmbedBuilder()



                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "⚠️ Waarschuwingen"
                )


                .setDescription(

                    `Gebruiker: ${user}

${warningText}`

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