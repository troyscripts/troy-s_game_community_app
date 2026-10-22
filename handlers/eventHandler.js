const fs = require("fs");
const path = require("path");

const logger = require("../utils/logger");
const config = require("../config/config");

function getGuildId(args) {
    for (const value of args) {
        const guildId = value?.guildId || value?.guild?.id;
        if (guildId) return guildId;
        if (value?.id && value?.channels?.cache && value?.members?.cache) return value.id;
    }
    return null;
}


module.exports = (client) => {


    const eventsPath =
        path.join(
            __dirname,
            "..",
            "events"
        );


    let loadedEvents = 0;

    const loadedEventNames = [];



    function loadEvents(directory) {


        if (!fs.existsSync(directory)) {


            logger.warn(
                "Events map bestaat niet."
            );

            return;

        }



        const files =
            fs.readdirSync(directory);



        for (const file of files) {


            if (
                file.startsWith(".")
            ) continue;



            const filePath =
                path.join(
                    directory,
                    file
                );



            const stat =
                fs.statSync(filePath);



            if (stat.isDirectory()) {


                loadEvents(
                    filePath
                );

                continue;

            }



            if (
                !file.endsWith(".js")
            ) continue;



            try {


                delete require.cache[
                    require.resolve(filePath)
                ];



                const event =
                    require(filePath);



                if (!event.name)
                    throw new Error(
                        "Event mist name."
                    );



                if (
                    typeof event.execute !== "function"
                )
                    throw new Error(
                        "Event mist execute()."
                    );



                if (
                    loadedEventNames.includes(
                        event.name
                    )
                ) {


                    logger.warn(
                        `Event dubbel geladen: ${event.name}`
                    );


                    continue;

                }



                loadedEventNames.push(
                    event.name
                );



                const handler =
                    async (...args) => {


                        try {


                            await config.__context.run(
                                getGuildId(args),
                                () => event.execute(client, ...args)
                            );


                        } catch(error) {


                            logger.error(
                                `Fout tijdens event ${event.name} (${file})`
                            );


                            logger.error(error);

                        }


                    };



                if(event.once) {


                    client.once(
                        event.name,
                        handler
                    );


                } else {


                    client.on(
                        event.name,
                        handler
                    );


                }



                loadedEvents++;


                logger.success(
                    `Event geladen: ${event.name}${event.once ? " (once)" : ""}`
                );



            } catch(error) {


                logger.error(
                    `Kon event ${file} niet laden`
                );


                logger.error(error);


            }


        }


    }



    loadEvents(eventsPath);



    logger.event(
        `${loadedEvents} events geladen`
    );


};
