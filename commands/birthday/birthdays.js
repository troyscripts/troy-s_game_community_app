const { MessageFlags } = require("discord.js");
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const config =
    require("../../config/config");

const birthday =
    require("../../database/birthday");



module.exports = {


    data: new SlashCommandBuilder()

        .setName("birthdays")

        .setDescription(
            "Bekijk de verjaardagen binnen de community."
        ),



    category: "Birthday",


    guildOnly: true,



    async execute(client, interaction) {


        await interaction.deferReply();


        const list =
            birthday.getBirthdays(

                interaction.guild.id

            );



        if (!list || list.length === 0) {


            return interaction.editReply({

                content:
                "🎂 Er zijn nog geen verjaardagen ingesteld.",

                flags: MessageFlags.Ephemeral

            });


        }



        let description = "";



        for (
            let i = 0;
            i < Math.min(list.length, 10);
            i++
        ) {


            const item =
                list[i];



            const member =
                await interaction.guild.members.fetch(

                    item.user_id

                ).catch(() => null);



            const username =
                member
                    ? member.user.username
                    : "Onbekend lid";



            description +=

                `🎂 **${username}**\n` +

                `📅 ${item.birthday}\n\n`;


        }



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "🎂 Verjaardagen"
                )


                .setDescription(

                    description

                )


                .setFooter({

                    text:
                    `${config.Bot.Footer} • Eerste 10 resultaten`

                })


                .setTimestamp();



        return interaction.editReply({

            embeds:[

                embed

            ]

        });


    }


};
