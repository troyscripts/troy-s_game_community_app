const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { Routes } = require('discord.js');
const { db } = require('../database/database');
const logger = require('../utils/logger');
let queue = Promise.resolve();

function commandPayload(client) {
    const commands = [];
    function visit(directory) {
        for (const entry of fs.readdirSync(directory, {withFileTypes:true})) {
            const filename = path.join(directory, entry.name);
            if (entry.isDirectory()) visit(filename);
            else if (entry.name.endsWith('.js')) {
                const command = require(filename);
                if (!command.data?.toJSON || typeof command.execute !== 'function') {
                    throw new Error(`Ongeldig slashcommand: ${entry.name}`);
                }
                const data = command.data.toJSON();
                if (client.commands.get(data.name) !== command) {
                    throw new Error(`Command niet correct geladen: ${data.name}`);
                }
                commands.push(data);
            }
        }
    }
    visit(path.join(__dirname, '..', 'commands'));
    if (!commands.length || new Set(commands.map(c => c.name)).size !== commands.length) {
        throw new Error('Lege of dubbele commandlijst; registratie afgebroken.');
    }
    return commands.sort((a,b) => a.name.localeCompare(b.name));
}

async function register(client, guild, force) {
    try {
        const body = commandPayload(client);
        const appId = client.user.id;
        const hash = createHash('sha256').update(JSON.stringify(body)).digest('hex');
        db.exec(`CREATE TABLE IF NOT EXISTS command_registration (
            application_id TEXT NOT NULL, guild_id TEXT NOT NULL,
            command_hash TEXT NOT NULL,
            PRIMARY KEY(application_id, guild_id)
        )`);
        const previous = db.prepare('SELECT command_hash FROM command_registration WHERE application_id = ? AND guild_id = ?').get(appId, guild.id);
        const route = Routes.applicationGuildCommands(appId, guild.id);
        if (!force && previous?.command_hash === hash) {
            // Controleer ook of commands buiten de bot om zijn verwijderd.
            const remote = await client.rest.get(route);
            const names = new Set(remote.map(c => `${c.type || 1}:${c.name}`));
            if (remote.length === body.length && body.every(c => names.has(`${c.type || 1}:${c.name}`))) {
                return {status:'unchanged'};
            }
        }
        await client.rest.put(route, {body});
        // Alleen een geslaagde registratie onthouden; fouten worden bij de
        // volgende start of server-toevoeging opnieuw geprobeerd.
        db.prepare(`INSERT INTO command_registration(application_id, guild_id, command_hash)
            VALUES (?, ?, ?) ON CONFLICT(application_id, guild_id)
            DO UPDATE SET command_hash = excluded.command_hash`).run(appId, guild.id, hash);
        logger.success(`${body.length} slashcommands automatisch geregistreerd in ${guild.name} (${guild.id}).`);
        return {status:'registered'};
    } catch (error) {
        logger.error(`Automatische commandregistratie mislukt voor server ${guild.id}: ${error.message || error}. Wordt bij de volgende botstart opnieuw geprobeerd.`);
        return {status:'failed'};
    }
}

function registerGuild(client, guild, {force = false} = {}) {
    // Alle servers delen dezelfde wachtrij; Discord.js verwerkt rate limits.
    const task = queue.then(() => register(client, guild, force));
    queue = task.catch(() => {});
    return task;
}

async function registerAllGuilds(client) {
    const counts = {registered:0, unchanged:0, failed:0};
    for (const guild of client.guilds.cache.values()) {
        const result = await registerGuild(client, guild);
        counts[result.status]++;
    }
    logger.info(`Commandcontrole: ${counts.registered} bijgewerkt, ${counts.unchanged} actueel, ${counts.failed} mislukt.`);
    return counts;
}
module.exports = {registerGuild, registerAllGuilds};
