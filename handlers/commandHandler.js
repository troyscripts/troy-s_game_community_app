const fs = require("fs");
const path = require("path");

const logger = require("../utils/logger");



module.exports = (client) => {


    const commandsPath =
        path.join(
            __dirname,
            "..",
            "commands"
        );



    let loadedCommands = 0;



    const defaults = {


        category:

            "Overig",



        permissions:

            [],



        botPermissions:

            [],



        cooldown:

            3,



        ownerOnly:

            false,



        developerOnly:

            false,



        serverOwnerOnly:

            false,



        staffOnly:

            false,



        guildOnly:

            false,



        dmAllowed:

            true



    };




    function loadCommands(directory) {


        if (!fs.existsSync(directory)) {


            logger.warn(
                "Commands map bestaat niet."
            );


            return;

        }



        const files =
            fs.readdirSync(directory);



        for(const file of files) {



            const filePath =
                path.join(
                    directory,
                    file
                );



            const stat =
                fs.statSync(filePath);



            if(stat.isDirectory()) {


                loadCommands(
                    filePath
                );


                continue;

            }



            if(!file.endsWith(".js"))
                continue;



            try {


                delete require.cache[
                    require.resolve(filePath)
                ];



                const command =
                    require(filePath);



                if(
                    !command.data &&
                    !command.name
                ) {


                    throw new Error(
                        "Command mist data of name."
                    );


                }



                if(
                    typeof command.execute !== "function"
                ) {


                    throw new Error(
                        "Command mist execute()."
                    );


                }



                Object.assign(

                    command,

                    {

                        ...defaults,

                        ...command

                    }

                );



                const commandName =
                    command.data?.name ||
                    command.name;



                if(
                    client.commands.has(
                        commandName
                    )
                ) {


                    throw new Error(
                        `Dubbele command: ${commandName}`
                    );


                }



                client.commands.set(

                    commandName,

                    command

                );



                loadedCommands++;



                logger.success(

                    `Command geladen: ${commandName} (${command.category})`

                );



            } catch(error) {


                logger.error(

                    `Kon command ${file} niet laden`

                );


                logger.error(error);


            }


        }


    }



    loadCommands(
        commandsPath
    );



    logger.command(

        `${loadedCommands} commands geladen`

    );


};
