const { Events, MessageFlags } = require("discord.js");

const logger = require("../utils/logger");
const { eventEmbed, logInteraction } = require("../utils/eventEmbeds");
const { canUseCommand } = require("../utils/permissions");

function resolveDynamic(collection, customId) {
    return collection.get(customId) || collection.get(customId.split(":")[0]);
}

async function sendPrivate(interaction, content) {
    const payload = {
        content: null,
        embeds: [eventEmbed("Interactie niet uitgevoerd", 0xFF5722, content,
            `Gebruiker-ID: ${interaction.user.id} | Interactie-ID: ${interaction.id}`)],
        allowedMentions: { parse: [] }
    };
    if (interaction.deferred) {
        return interaction.editReply(payload);
    }

    if (interaction.replied) {
        return interaction.followUp({ ...payload, flags: MessageFlags.Ephemeral });
    }

    return interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
}

module.exports = {
    name: Events.InteractionCreate,

    async execute(client, interaction) {
        let state = "Onbekende interactie";
        try {
            if (interaction.isAutocomplete()) {
                const command = client.commands.get(interaction.commandName);
                if (command?.autocomplete && canUseCommand(interaction, command)) {
                    await command.autocomplete(client, interaction);
                } else if (!interaction.responded) {
                    await interaction.respond([]);
                }
                return;
            }

            if (interaction.isChatInputCommand()) {
                const command = client.commands.get(interaction.commandName);
                if (!command) {
                    return;
                }

                if (command.guildOnly && !interaction.inGuild()) {
                    state = "Alleen in server toegestaan";
                    return sendPrivate(interaction, "❌ Dit command werkt alleen in een server.");
                }

                if (!canUseCommand(interaction, command)) {
                    state = "Geen toestemming";
                    return sendPrivate(
                        interaction,
                        "❌ Je hebt geen toestemming om dit command te gebruiken."
                    );
                }

                const cooldownSeconds = Math.max(0, Number(command.cooldown) || 0);
                const cooldownKey = `${interaction.guildId || "dm"}:${interaction.commandName}:${interaction.user.id}`;
                const expiresAt = client.cooldowns.get(cooldownKey) || 0;

                if (expiresAt > Date.now()) {
                    state = "Wachttijd actief";
                    const remaining = Math.ceil((expiresAt - Date.now()) / 1000);
                    return sendPrivate(
                        interaction,
                        `⏳ Wacht nog ${remaining} seconde(n) voordat je dit command opnieuw gebruikt.`
                    );
                }

                client.cooldowns.set(cooldownKey, Date.now() + cooldownSeconds * 1000);
                setTimeout(() => client.cooldowns.delete(cooldownKey), cooldownSeconds * 1000).unref();

                await command.execute(client, interaction);
                state = "Afgehandeld";
                return;
            }

            if (interaction.isButton()) {
                const button = resolveDynamic(client.buttons, interaction.customId);
                if (button) {
                    await button.execute(client, interaction);
                state = "Afgehandeld";
                }
                return;
            }

            if (interaction.isModalSubmit()) {
                const modal = resolveDynamic(client.modals, interaction.customId);
                if (modal) {
                    await modal.execute(client, interaction);
                state = "Afgehandeld";
                }
                return;
            }

            if (interaction.isAnySelectMenu()) {
                const menu = resolveDynamic(client.selectMenus, interaction.customId);
                if (menu) {
                    await menu.execute(client, interaction);
                state = "Afgehandeld";
                }
            }
        } catch (error) {
            state = "Fout";
            const location = interaction.commandName
                ? `Command: ${interaction.commandName}`
                : `Interaction: ${interaction.customId || "onbekend"}`;

            logger.error(`Fout in ${location}`);
            logger.error(error.stack || error);

            await sendPrivate(
                interaction,
                "❌ Er ging iets fout tijdens deze actie. De fout is opgeslagen in de logs."
            ).catch(() => {});
        } finally {
            await logInteraction(interaction, state);
        }
    }
};
