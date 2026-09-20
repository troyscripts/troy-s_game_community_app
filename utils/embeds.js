const { EmbedBuilder } = require("discord.js");
const config = require("../config/config");


class EmbedUtils {


    /**
     * Basis embed
     */
    create(options = {}) {

        const embed = new EmbedBuilder()
            .setColor(
                options.color ||
                config.Bot?.Color ||
                "#5865F2"
            )
            .setTimestamp();



        if (options.title) {

            embed.setTitle(
                options.title
            );

        }



        if (options.description) {

            embed.setDescription(
                options.description
            );

        }



        if (options.thumbnail) {

            embed.setThumbnail(
                options.thumbnail
            );

        }



        if (options.image) {

            embed.setImage(
                options.image
            );

        }



        if (options.footer !== false) {

            embed.setFooter({

                text:
                    options.footerText ||
                    config.Bot?.Footer ||
                    "Discord Bot"

            });

        }



        if (options.author) {

            embed.setAuthor(
                options.author
            );

        }



        return embed;

    }



    /**
     * Succes bericht
     */
    success(description) {

        return this.create({

            color: "#57F287",

            title: "✅ Succes",

            description

        });

    }



    /**
     * Fout bericht
     */
    error(description) {

        return this.create({

            color: "#ED4245",

            title: "❌ Fout",

            description

        });

    }



    /**
     * Waarschuwing
     */
    warning(description) {

        return this.create({

            color: "#FEE75C",

            title: "⚠️ Waarschuwing",

            description

        });

    }



    /**
     * Informatie
     */
    info(description) {

        return this.create({

            color: "#5865F2",

            title: "ℹ️ Informatie",

            description

        });

    }



    /**
     * Loading embed
     */
    loading(description = "Even geduld...") {

        return this.create({

            color: "#5865F2",

            title: "⏳ Bezig",

            description

        });

    }



    /**
     * Command foutmelding
     */
    commandError(error) {

        return this.error(
            `Er ging iets fout tijdens het uitvoeren van dit command.\n\n\`\`\`${error}\`\`\``
        );

    }



}



module.exports = new EmbedUtils();
