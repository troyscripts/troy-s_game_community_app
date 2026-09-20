const fs = require("fs");
const path = require("path");

const logger = require("../utils/logger");


module.exports = (client) => {


    const selectMenusPath = path.join(
        __dirname,
        "..",
        "selectmenus"
    );


    let loadedSelectMenus = 0;



    function loadSelectMenus(directory) {


        if (!fs.existsSync(directory)) {


            logger.warn(
                "Selectmenus map bestaat niet."
            );


            return;

        }



        const files =
            fs.readdirSync(directory);



        for (const file of files) {



            // Verborgen bestanden overslaan

            if (
                file.startsWith(".")
            ) {

                continue;

            }



            const filePath =
                path.join(
                    directory,
                    file
                );



            const stat =
                fs.statSync(filePath);



            // Submappen ondersteunen

            if (
                stat.isDirectory()
            ) {


                loadSelectMenus(
                    filePath
                );


                continue;

            }



            // Alleen JS bestanden

            if (
                !file.endsWith(".js")
            ) {

                continue;

            }



            try {



                delete require.cache[
                    require.resolve(filePath)
                ];



                const selectMenu =
                    require(filePath);



                if (
                    !selectMenu.customId
                ) {


                    logger.warn(
                        `${file} mist customId`
                    );


                    continue;

                }



                if (
                    typeof selectMenu.execute !== "function"
                ) {


                    logger.warn(
                        `${selectMenu.customId} mist execute()`
                    );


                    continue;

                }



                if (
                    client.selectMenus.has(
                        selectMenu.customId
                    )
                ) {


                    logger.warn(
                        `Dubbele selectmenu ID: ${selectMenu.customId}`
                    );


                    continue;

                }



                client.selectMenus.set(

                    selectMenu.customId,

                    selectMenu

                );



                loadedSelectMenus++;



                logger.success(

                    `Selectmenu geladen: ${selectMenu.customId}`

                );



            } catch(error) {



                logger.error(

                    `Kon selectmenu ${file} niet laden`

                );


                logger.error(
                    error
                );


            }


        }


    }



    loadSelectMenus(
        selectMenusPath
    );



    logger.event(

        `${loadedSelectMenus} selectmenus geladen`

    );


};