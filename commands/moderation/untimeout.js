const { tr, send } = require("../../utils/localization");
const { MessageFlags } = require("../../utils/discord");
const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits
} = require("../../utils/discord");

const config =
    require("../../config/config");



module.exports = {


    data: new SlashCommandBuilder()

        .setName("untimeout")

        .setDescription(
            "Verwijder een timeout van een gebruiker."
        )


        .addUserOption(option =>

            option

                .setName("gebruiker")

                .setDescription(
                    "De gebruiker waarvan je de timeout wilt verwijderen."
                )

                .setRequired(true)

        ),



    category: "Moderation",


    permissions: [

        "ModerateMembers"

    ],


    guildOnly: true,



    async execute(client, interaction) {

        await interaction.deferReply();


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
                tr("❌ Deze gebruiker zit niet meer op de server."),

                flags: MessageFlags.Ephemeral

            });


        }



        if (
            !member.communicationDisabledUntil
        ) {


            return send(interaction, "editReply", {

                content:
                tr("❌ Deze gebruiker heeft momenteel geen timeout."),

                flags: MessageFlags.Ephemeral

            });


        }



        if (
            !member.moderatable ||
            member.roles.highest.position >= interaction.member.roles.highest.position
        ) {


            return send(interaction, "editReply", {

                content:
                tr("❌ Je kunt deze gebruiker niet modereren. Controleer de rollenhiërarchie van jou en de bot.")

            });


        }



        await member.timeout(
            null,
            `Timeout verwijderd door ${interaction.user.tag}`
        );



        const embed =
            new EmbedBuilder()


                .setColor(
                    config.Bot.Color
                )


                .setTitle(
                    tr("🔊 Timeout verwijderd")
                )


                .addFields(

                    {

                        name:
                        tr("Gebruiker"),

                        value:
                        `${user}`,

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
