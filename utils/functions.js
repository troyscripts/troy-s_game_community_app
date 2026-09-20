const crypto = require("crypto");


/**
 * Wacht een aantal milliseconden
 */
function wait(ms) {

    return new Promise(resolve =>
        setTimeout(resolve, ms)
    );

}



/**
 * Genereert een willekeurige ID
 */
function generateId(length = 16) {

    return crypto
        .randomBytes(length)
        .toString("hex");

}



/**
 * Controleert of waarde leeg is
 */
function isEmpty(value) {

    return (
        value === undefined ||
        value === null ||
        value === ""
    );

}



/**
 * Verkort tekst
 */
function truncate(
    text,
    maxLength = 100
) {

    if (!text)
        return "";

    if (text.length <= maxLength)
        return text;


    return (
        text.substring(0, maxLength - 3)
        + "..."
    );

}



/**
 * Zet seconden om naar leesbare tijd
 */
function formatDuration(seconds) {


    const dagen =
        Math.floor(seconds / 86400);


    seconds %= 86400;


    const uren =
        Math.floor(seconds / 3600);


    seconds %= 3600;


    const minuten =
        Math.floor(seconds / 60);


    const seconden =
        seconds % 60;



    const output = [];


    if (dagen)
        output.push(`${dagen}d`);


    if (uren)
        output.push(`${uren}u`);


    if (minuten)
        output.push(`${minuten}m`);


    if (seconden)
        output.push(`${seconden}s`);



    return output.join(" ") || "0s";

}



/**
 * Controleert of bot online is
 */
function isBotUser(user) {

    return user?.bot === true;

}



/**
 * Haalt datum/tijd op
 */
function getTimestamp() {

    return Math.floor(
        Date.now() / 1000
    );

}



/**
 * Maak een nette naam
 */
function cleanName(name) {

    return name
        .replace(/[^a-zA-Z0-9-_]/g, "")
        .toLowerCase();

}



/**
 * Random nummer
 */
function randomNumber(
    min,
    max
) {

    return Math.floor(
        Math.random() * (max - min + 1)
    ) + min;

}



/**
 * Array verdelen in stukken
 */
function chunk(
    array,
    size
) {

    const chunks = [];


    for (
        let i = 0;
        i < array.length;
        i += size
    ) {

        chunks.push(
            array.slice(i, i + size)
        );

    }


    return chunks;

}



module.exports = {

    wait,

    generateId,

    isEmpty,

    truncate,

    formatDuration,

    isBotUser,

    getTimestamp,

    cleanName,

    randomNumber,

    chunk

};
