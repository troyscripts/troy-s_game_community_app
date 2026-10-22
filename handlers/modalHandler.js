const fs = require("fs");
const path = require("path");

const logger = require("../utils/logger");


module.exports = (client) => {


    const modalsPath = path.join(
        __dirname,
        "..",
        "modals"
    );


    let loaded = 0;



    function loadModals(directory) {


        if (!fs.existsSync(directory)) {


            logger.warn(
                "Modals map bestaat niet."
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


                loadModals(
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



                const modal =
                    require(filePath);



                if(!modal.customId) {


                    logger.warn(
                        `${file} mist customId`
                    );


                    continue;

                }



                if(
                    typeof modal.execute !== "function"
                ) {


                    logger.warn(
                        `${modal.customId} mist execute()`
                    );


                    continue;

                }



                if(
                    client.modals.has(
                        modal.customId
                    )
                ) {


                    logger.warn(
                        `Dubbele modal ID: ${modal.customId}`
                    );


                    continue;

                }



                client.modals.set(

                    modal.customId,

                    modal

                );



                loaded++;



                logger.success(

                    `Modal geladen: ${modal.customId}`

                );



            } catch(error) {


                logger.error(

                    `Kon modal ${file} niet laden`

                );


                logger.error(
                    error
                );


            }


        }


    }



    loadModals(
        modalsPath
    );



    logger.event(

        `${loaded} modals geladen`

    );


};