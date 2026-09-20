const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const errors = [];

function walk(directory) {
    const files = [];

    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if ((["node_modules", "logs", "backups", "transcripts", ".git"].includes(entry.name) || entry.name.startsWith("github-export-"))) {
            continue;
        }

        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...walk(fullPath));
        } else {
            files.push(fullPath);
        }
    }

    return files;
}

const jsFiles = walk(root).filter((file) => /\.(?:js|cjs)$/.test(file));

for (const file of jsFiles) {
    const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    if (result.status !== 0) {
        errors.push(`${path.relative(root, file)}: ${result.stderr.trim()}`);
    }
}

const commandNames = new Map();
for (const file of walk(path.join(root, "commands")).filter((item) => item.endsWith(".js"))) {
    const source = fs.readFileSync(file, "utf8");
    const name = source.match(/\.setName\(\s*["']([^"']+)["']\s*\)/)?.[1];

    if (!name) {
        errors.push(`${path.relative(root, file)}: commandonaam ontbreekt.`);
        continue;
    }

    if (commandNames.has(name)) {
        errors.push(
            `Dubbel command ${name}: ${path.relative(root, commandNames.get(name))} en ` +
            path.relative(root, file)
        );
    }
    commandNames.set(name, file);
}

const requiredFiles = [
    ".env.example",
    ".gitignore",
    "package-lock.json",
    "config/updates.js",
    "services/updateChecker.js",
    "index.js",
    "deploy-commands.js",
    "config/config.js",
    "config/defaults.js",
    "database/database.js",
    "database/guildSettings.js",
    "database/counting.js",
    "events/interactionCreate.js",
    "events/guildCreate.js",
    "events/ready.js",
    "services/countingGame.js",
    "services/messageScanner.js",
    "services/startupReporter.js"
];

for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(root, file))) {
        errors.push(`Verplicht bestand ontbreekt: ${file}`);
    }
}

const config = require(path.join(root, "config/config"));
if (config.StartupReport?.Channel && !/^\d{17,20}$/.test(config.StartupReport.Channel)) {
    errors.push("StartupReport.Channel bevat geen geldig Discord-ID.");
}

if (config.Counting?.Channel && !/^\d{17,20}$/.test(config.Counting.Channel)) {
    errors.push("Counting.Channel bevat geen geldig Discord-ID.");
}

if (errors.length) {
    console.error(`Controle mislukt met ${errors.length} fout(en):`);
    for (const error of errors) {
        console.error(`- ${error}`);
    }
    process.exitCode = 1;
} else {
    console.log(
        `Controle geslaagd: ${jsFiles.length} JavaScript-bestanden en ` +
        `${commandNames.size} slashcommands.`
    );
}
