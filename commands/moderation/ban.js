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

        .setName("ban")

        .setDescription(
            "Verban een gebruiker van de server."
        )


        .addUserOption(option =>

            option

                .setName("gebruiker")

                .setDescription(
                    "De gebruiker die je wilt bannen."
                )

                .setRequired(true)

        )


        .addStringOption(option =>

            option

                .setName("reden")

                .setDescription(
                    "Reden van de ban."
                )

                .setRequired(true)

        )



        .addIntegerOption(option =>

            option

                .setName("dagen")

                .setDescription(
                    "Aantal dagen berichten verwijderen."
                )

                .setRequired(false)

                .setMinValue(0)

                .setMaxValue(7)

        ),



    category: "Moderation",


    permissions: [

        "BanMembers"

    ],


    guildOnly: true,



    async execute(client, interaction) {

        await interaction.deferReply();


        const user =
            interaction.options.getUser(
                "gebruiker"
            );


        const reason =
            interaction.options.getString(
                "reden"
            );


        const days =
            interaction.options.getInteger(
                "dagen"
            ) ?? 0;



        const member =
            await interaction.guild.members.fetch(
                user.id
            ).catch(() => null);



        if (!member) {


            return send(interaction, "editReply", {

                content:
                tr("❌ Deze gebruiker zit niet op de server."),

                flags: MessageFlags.Ephemeral

            });


        }



        if (
            member.id === interaction.user.id
        ) {


            return send(interaction, "editReply", {

                content:
                tr("❌ Je kunt jezelf niet bannen."),

                flags: MessageFlags.Ephemeral

            });


        }



        if (
            member.roles.highest.position >=
            interaction.member.roles.highest.position
        ) {


            return send(interaction, "editReply", {

                content:
                tr("❌ Je kunt geen gebruiker bannen met een gelijke of hogere rol."),

                flags: MessageFlags.Ephemeral

            });


        }



        if (
            !member.bannable
        ) {


            return send(interaction, "editReply", {

                content:
                tr("❌ Ik kan deze gebruiker niet bannen. Controleer mijn rolpositie."),

                flags: MessageFlags.Ephemeral

            });


        }



        await send(user, "send", {

            embeds:[

                new EmbedBuilder()

                    .setColor(
                        "#ff0000"
                    )

                    .setTitle(
                        "🔨 Je bent verbannen"
                    )

                    .setDescription(

                        `Je bent verbannen uit **${interaction.guild.name}**.

` +

                        `Reden: ${reason}`

                    )

                    .setTimestamp()

            ]

        }).catch(() => {});



        await member.ban({

            deleteMessageSeconds:
            days * 86400,


            reason:
            `${reason} | Door: ${interaction.user.tag}`

        });



        const embed =
            new EmbedBuilder()


                .setColor(
                    "#ff0000"
                )


                .setTitle(
                    tr("🔨 Gebruiker verbannen")
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
                        "Moderator",

                        value:
                        `${interaction.user}`,

                        inline:true

                    },


                    {

                        name:
                        tr("Reden"),

                        value:
                        reason

                    },


                    {

                        name:
                        tr("Berichten verwijderd"),

                        value:
                        tr("{0} dag(en)", days)

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
