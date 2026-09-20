const { MessageFlags } = require("discord.js");
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

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


            return interaction.reply({

                content:
                `✅ ${user} heeft geen waarschuwingen.`,

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

                    `Gebruiker: ${user}\n\n${warningText}`

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