const chalk = require("chalk");


module.exports = {


    // Algemene kleuren

    info: chalk.cyan,

    success: chalk.green,

    warning: chalk.yellow,

    error: chalk.red,

    debug: chalk.magenta,

    normal: chalk.white,

    gray: chalk.gray,



    // Extra logging kleuren

    database: chalk.blue,

    command: chalk.greenBright,

    event: chalk.blueBright,

    startup: chalk.whiteBright,

    system: chalk.cyanBright,



    // Status kleuren

    online: chalk.green,

    offline: chalk.red,

    loading: chalk.yellow,



    // Tekst effecten

    bold: chalk.bold,

    dim: chalk.dim,

    underline: chalk.underline

};