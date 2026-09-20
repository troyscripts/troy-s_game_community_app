const fs = require("fs");
const path = require("path");
const chalk = require("chalk");

const config = require("../config/config");

class Logger {
    getTime() {
        return new Date().toLocaleTimeString("nl-NL", { hour12: false });
    }

    getDate() {
        return new Date().toISOString().slice(0, 10);
    }

    formatMessage(message) {
        if (message instanceof Error) {
            return message.stack || message.message;
        }

        if (typeof message === "object") {
            try {
                return JSON.stringify(message, null, 2);
            } catch {
                return String(message);
            }
        }

        return String(message);
    }

    write(type, color, message) {
        if (config.Logging?.Enabled === false) {
            return;
        }

        const formatted = this.formatMessage(message);
        const plainLine = `[${this.getTime()}] [${type}] ${formatted}`;

        if (config.Logging?.Console !== false) {
            console.log(
                `${chalk.gray(`[${this.getTime()}]`)} ${color(`[${type}]`)} ${formatted}`
            );
        }

        if (config.Logging?.Files) {
            try {
                const logFolder = path.join(__dirname, "..", "logs");
                fs.mkdirSync(logFolder, { recursive: true });
                fs.appendFileSync(
                    path.join(logFolder, `${this.getDate()}.log`),
                    `${plainLine}\n`,
                    "utf8"
                );
            } catch (error) {
                console.error("Kon niet naar het logbestand schrijven:", error.message);
            }
        }
    }

    info(message) { this.write("INFO", chalk.cyan, message); }
    success(message) { this.write("SUCCESS", chalk.green, message); }
    warn(message) { this.write("WARNING", chalk.yellow, message); }
    error(message) { this.write("ERROR", chalk.red, message); }
    database(message) { this.write("DATABASE", chalk.blue, message); }
    command(message) { this.write("COMMAND", chalk.greenBright, message); }
    event(message) { this.write("EVENT", chalk.blueBright, message); }
    startup(message) { this.write("STARTUP", chalk.whiteBright, message); }

    debug(message) {
        if (config.Debug) {
            this.write("DEBUG", chalk.magenta, message);
        }
    }
}

module.exports = new Logger();
