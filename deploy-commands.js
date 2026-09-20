require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");

const databaseManager = require("./database/manager");
const guildSettings = require("./database/guildSettings");

function loadCommands(directory) {
    const commands = [];

    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            commands.push(...loadCommands(fullPath));
            continue;
        }

        if (!entry.name.endsWith(".js")) {
            continue;
        }

        delete require.cache[require.resolve(fullPath)];
        const command = require(fullPath);

        if (!command.data?.toJSON || typeof command.execute !== "function") {
            throw new Error(`${fullPath} is geen geldig slashcommand.`);
        }

        commands.push(command.data.toJSON());
    }

    return commands;
}

async function registerGuildCommands(rest, clientId, guildIds, commands) {
    const failures = [];
    const succeeded = [];

    for (const guildId of guildIds) {
        console.log(`Registreert ${commands.length} commands in server ${guildId}...`);

        try {
            await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands }
            );
            succeeded.push(guildId);
            console.log(`✅ Slashcommands geregistreerd in server ${guildId}.`);
        } catch (error) {
            failures.push({ guildId, error });
            console.error(
                `❌ Registratie mislukt in server ${guildId}: ${error.message || error}`
            );
        }
    }

    return { succeeded, failures };
}

async function deploy() {
    const token = process.env.TOKEN;
    const clientId = process.env.CLIENT_ID;

    if (!token || !clientId) {
        throw new Error("TOKEN en CLIENT_ID moeten in .env staan.");
    }

    databaseManager.initialize();

    try {
        const commands = loadCommands(path.join(__dirname, "commands"));
        const names = commands.map((command) => command.name);

        if (new Set(names).size !== names.length) {
            throw new Error("Dubbele slashcommandnamen gevonden.");
        }

        let guildIds = guildSettings.getRegisteredGuildIds();
        let source = "SQLite-database";

        // Alleen voor een volledig lege eerste installatie. Zodra de bot één keer
        // online is geweest, wordt iedere guild automatisch in SQLite geregistreerd.
        if (!guildIds.length && /^\d{17,20}$/.test(process.env.GUILD_ID || "")) {
            guildIds = [process.env.GUILD_ID];
            source = "GUILD_ID-noodinstelling";
        }

        if (!guildIds.length) {
            throw new Error(
                "Geen guild-ID in SQLite gevonden. Start de bot één keer nadat hij " +
                "aan de server is toegevoegd en voer daarna npm run deploy opnieuw uit."
            );
        }

        console.log(
            `${guildIds.length} guild-ID('s) geladen uit ${source}: ${guildIds.join(", ")}`
        );

        const rest = new REST({ version: "10" }).setToken(token);
        const { failures } = await registerGuildCommands(
            rest,
            clientId,
            guildIds,
            commands
        );

        if (failures.length) {
            const failedIds = failures.map((item) => item.guildId).join(", ");
            throw new Error(
                `Registratie mislukt voor ${failures.length} server(s): ${failedIds}. ` +
                "Controleer of de bot nog lid is van deze server(s)."
            );
        }

        console.log(
            `Alle ${commands.length} slashcommands zijn in ${guildIds.length} server(s) geregistreerd.`
        );
    } finally {
        databaseManager.close();
    }
}

if (require.main === module) {
    deploy().catch((error) => {
        console.error("Registratie van slashcommands mislukt:");
        console.error(error);
        process.exitCode = 1;
    });
}

module.exports = { deploy, loadCommands, registerGuildCommands };
