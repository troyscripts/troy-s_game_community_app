const { tr, send } = require("../../utils/localization");
const { MessageFlags } = require("../../utils/discord");
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("../../utils/discord");

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


            return send(interaction, "editReply", {

                content:
                tr("🎂 Er zijn nog geen verjaardagen ingesteld."),

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
                    : tr("Onbekend lid");



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
                    tr("{0} • Eerste 10 resultaten", config.Bot.Footer)

                })


                .setTimestamp();



        return send(interaction, "editReply", {

            embeds:[

                embed

            ]

        });


    }


};
