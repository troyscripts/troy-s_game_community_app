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

        .setName("setbirthday")

        .setDescription(
            "Stel je verjaardag in."
        )


        .addStringOption(option =>

            option

                .setName("datum")

                .setDescription(
                    "Gebruik formaat DD-MM-JJJJ (bijv. 15-09-1991)"
                )

                .setRequired(true)

        ),



    category: "Birthday",


    guildOnly: true,



    async execute(client, interaction) {


        const date =
            interaction.options.getString(
                "datum"
            );



        const regex =
            /^\d{2}-\d{2}-\d{4}$/;



        if (!regex.test(date)) {


            return send(interaction, "reply", {

                content:
                tr("❌ Ongeldige datum. Gebruik DD-MM-JJJJ.\nVoorbeeld: `15-09-1991`"),

                flags: MessageFlags.Ephemeral

            });


        }



        const [day, month, year] =
            date.split("-").map(Number);



        const checkDate =
            new Date(
                year,
                month - 1,
                day
            );



        if (

            checkDate.getDate() !== day ||

            checkDate.getMonth() !== month - 1 ||

            checkDate.getFullYear() !== year

        ) {


            return send(interaction, "reply", {

                content:
                tr("❌ Deze datum bestaat niet."),

                flags: MessageFlags.Ephemeral

            });


        }



        birthday.setBirthday(

            interaction.user.id,

            interaction.guild.id,

            date

        );



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "🎂 Verjaardag opgeslagen"
                )


                .setDescription(

                    "Je verjaardag staat nu ingesteld op:\n\n" +

                    `🎉 **${date}**`

                )


                .setTimestamp()


                .setFooter({

                    text:
                    config.Bot.Footer

                });



        return send(interaction, "reply", {

            embeds:[

                embed

            ],

            flags: MessageFlags.Ephemeral

        });


    }


};