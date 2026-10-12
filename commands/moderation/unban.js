const { tr, send } = require("../../utils/localization");
const { MessageFlags } = require("../../utils/discord");
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("../../utils/discord");

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


            return send(interaction, "editReply", {

                content:
                tr("❌ Ongeldige Discord ID."),

                flags: MessageFlags.Ephemeral

            });


        }



        const ban =
            await interaction.guild.bans.fetch(
                user.id
            ).catch(() => null);



        if (!ban) {


            return send(interaction, "editReply", {

                content:
                tr("❌ {0} staat niet op de banlijst.", user.tag),

                flags: MessageFlags.Ephemeral

            });


        }



        await interaction.guild.members.unban(

            user.id,

            tr("Unban door {0}", interaction.user.tag)

        );



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    tr("🔓 Ban verwijderd")
                )


                .addFields(

                    {

                        name:
                        tr("Gebruiker"),

                        value:
                        `${user.tag}\n${user.id}`,

                        inline:true

                    },


                    {

                        name:
                        tr("Uitgevoerd door"),

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



        return send(interaction, "editReply", {

            embeds:[

                embed

            ]

        });


    }


};
