const { MessageFlags } = require("discord.js");
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const config =
    require("../../config/config");



module.exports = {


    data: new SlashCommandBuilder()

        .setName("unban")

        .setDescription(
            "Verwijder een ban van een gebruiker."
        )


        .addStringOption(option =>

            option

                .setName("userid")

                .setDescription(
                    "Discord ID van de gebruiker."
                )

                .setRequired(true)

        ),



    category: "Moderation",


    permissions: [

        "BanMembers"

    ],


    guildOnly: true,



    async execute(client, interaction) {

        await interaction.deferReply();


        const userId =
            interaction.options.getString(
                "userid"
            );



        let user;



        try {


            user =
                await client.users.fetch(
                    userId
                );


        } catch(error) {


            return interaction.editReply({

                content:
                "❌ Ongeldige Discord ID.",

                flags: MessageFlags.Ephemeral

            });


        }



        const ban =
            await interaction.guild.bans.fetch(
                user.id
            ).catch(() => null);



        if (!ban) {


            return interaction.editReply({

                content:
                `❌ ${user.tag} staat niet op de banlijst.`,

                flags: MessageFlags.Ephemeral

            });


        }



        await interaction.guild.members.unban(

            user.id,

            `Unban door ${interaction.user.tag}`

        );



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    "🔓 Ban verwijderd"
                )


                .addFields(

                    {

                        name:
                        "Gebruiker",

                        value:
                        `${user.tag}\n${user.id}`,

                        inline:true

                    },


                    {

                        name:
                        "Uitgevoerd door",

                        value:
                        `${interaction.user}`,

                        inline:true

                    }

                )


                .setTimestamp()


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
