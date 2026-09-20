const fs = require("fs");
const path = require("path");

const logger = require("../utils/logger");



module.exports = (client) => {


    const buttonsPath =
        path.join(
            __dirname,
            "..",
            "buttons"
        );



    let loadedButtons = 0;



    function loadButtons(directory) {


        if (!fs.existsSync(directory)) {


            logger.warn(
                "Buttons map bestaat niet."
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


                loadButtons(
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



                const button =
                    require(filePath);



                if(!button.customId) {


                    logger.warn(
                        `${file} mist customId`
                    );


                    continue;

                }



                if(
                    typeof button.execute !== "function"
                ) {


                    logger.warn(
                        `${button.customId} mist execute()`
                    );


                    continue;

                }



                if(
                    client.buttons.has(
                        button.customId
                    )
                ) {


                    logger.warn(
                        `Dubbele button ID: ${button.customId}`
                    );


                    continue;

                }



                client.buttons.set(

                    button.customId,

                    button

                );



                loadedButtons++;



                logger.success(

                    `Button geladen: ${button.customId}`

                );



            } catch(error) {


                logger.error(

                    `Kon button ${file} niet laden`

                );


                logger.error(error);


            }


        }


    }



    loadButtons(
        buttonsPath
    );



    logger.event(

        `${loadedButtons} buttons geladen`

    );


};