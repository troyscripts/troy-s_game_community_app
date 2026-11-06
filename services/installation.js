const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags, Routes } = require('discord.js');
const settings = require('../database/guildSettings');
const progress = require('../database/installation');
const { send, pair } = require('../utils/localization');
const busy = new Set();
const extraSteps = {
    '@profielfoto': '/bot-avatar instellen',
    '@welkomstvertaling': '/welkomstbericht vertalen',
    '@creatormeldingen': '/notify toevoegen',
    '@selfrolpanelen': '/selfrollen maken',
    '@ticketpanelen': '/ticket-panel',
    '@politie': '/politie instellen (per afdeling), daarna /politie voor het paneel',
    '@ambulance': '/ambulance instellen (per afdeling), daarna /ambulance voor het paneel',
    '@pechhulp': '/pechhulp instellen (per afdeling), daarna /pechhulp voor het paneel',
    '@brandweer': '/brandweer (optioneel; alleen activeren als deze afdeling in gebruik is)',
    '@overheidscoordinator': '/overheidscoordinator instellen (per afdeling), daarna /overheidscoordinator voor het paneel',
    '@radiopaneel': '/radio paneel',
    '@agenda': '/agenda toevoegen en /agenda tonen',
    '@hosting': 'INSTALLATIE.md en .env.example: token, client-ID, AI/API-sleutels, centrale botkoppeling en globale status'
};
function paths() { return [...settings.getEditablePaths(), ...Object.keys(extraSteps)]; }
function allowed(interaction) {
    if (!interaction.guild || interaction.user.bot) return false;
    if (interaction.guild.ownerId === interaction.user.id) return true;
    const roles = settings.getGuildConfig(interaction.guild.id).Roles;
    return ['Owner', 'Developer'].some(key => roles[key] && roles[key] !== interaction.guild.id && interaction.member?.roles?.cache?.has(roles[key]));
}
async function authorize(interaction) {
    if (allowed(interaction)) return true;
    await send(interaction, 'reply', { content: pair('❌ Alleen de servereigenaar en de ingestelde Owner- of Developer-rol mogen dit gebruiken.', '❌ Only the server owner and configured Owner or Developer role may use this.'), flags: MessageFlags.Ephemeral });
    return false;
}
function validateName(input) {
    const name = String(input).trim();
    if (!name || name.length > 32 || /[\u0000-\u001f\u007f]/.test(name)) throw new Error('Gebruik een naam van 1 tot 32 tekens zonder regeleinden.');
    return name;
}
async function rename(client, interaction, input) {
    const name = validateName(input);
    await client.rest.patch(Routes.guildMember(interaction.guild.id, '@me'), {
        body: { nick: name }, reason: `Botnaam gewijzigd door ${interaction.user.id}`
    });
    settings.setBotName(interaction.guild.id, name);
    return name;
}
function next(state) {
    state.current = paths().find(path => !state.done.includes(path) && !state.skipped.includes(path)) || null;
}
function view(guildId, state, notice = '') {
    const all = paths(), path = state.current;
    const cfg = settings.getGuildConfig(guildId);
    const pending = all.filter(p => !state.done.includes(p));
    const text = path ? extraSteps[path] || JSON.stringify(settings.getPath(cfg, path)) : '';
    const content = `${notice}\n**${cfg.Bot.Name} — ${pair('Installatie', 'Installation')}**\n` +
        `${state.done.filter(p => all.includes(p)).length}/${all.length} ${pair('doorgenomen', 'reviewed')} · ${state.skipped.length} ${pair('overgeslagen', 'skipped')}\n\n` +
        (path ? `**${path}**\n${String(text).replaceAll('`', 'ˋ').slice(0, 800)}\n\n` +
            (extraSteps[path] ? pair('Voer dit apart uit en kies daarna Behouden / klaar, of sla het over.', 'Complete this separately, then select Keep / done, or skip it.') :
                pair('Wijzigen: ja/nee, getal, tekst, kanaal-/rol-ID of lijst met komma’s (Birthday.Messages: |). Behouden accepteert de huidige waarde. Overslaan laat alleen deze instelling open.', 'Edit: yes/no, number, text, channel/role ID or comma-separated list (Birthday.Messages: |). Keep accepts the current value. Skip leaves only this setting pending.')) :
            pending.length ? pair('Deze ronde is klaar. Overgeslagen instellingen blijven open; kies Overgeslagen hervatten.', 'This round is complete. Skipped settings remain pending; choose Resume skipped.') : pair('Alle stappen zijn doorgenomen.', 'All steps have been reviewed.')) +
        '\n\n' + pair('Hervatten of een instelling kiezen: /gebruikersnaam. Bestaande instellingen blijven bewaard.', 'Resume or choose a setting: /gebruikersnaam. Existing settings are preserved.');
    const button = (action, nl, en, style = ButtonStyle.Secondary) => new ButtonBuilder()
        .setCustomId(`installation:${state.revision}:${action}`).setLabel(pair(nl, en)).setStyle(style);
    const buttons = path ? [button('edit', 'Wijzigen', 'Edit', ButtonStyle.Primary).setDisabled(Boolean(extraSteps[path])), button('keep', 'Behouden / klaar', 'Keep / done'), button('skip', 'Overslaan', 'Skip')] : [];
    buttons.push(button('retry', 'Overgeslagen hervatten', 'Resume skipped').setDisabled(!state.skipped.length));
    return { content, components: [new ActionRowBuilder().addComponents(buttons)], allowedMentions: { parse: [] } };
}
async function open(client, interaction) {
    if (!await authorize(interaction)) return;
    const guildId = interaction.guild.id;
    if (busy.has(guildId)) return send(interaction, 'reply', { content: 'Er wordt al een wijziging verwerkt. Probeer het opnieuw.', flags: MessageFlags.Ephemeral });
    busy.add(guildId);
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const name = interaction.options.getString('naam');
        if (name !== null) await rename(client, interaction, name);
        const state = progress.get(guildId);
        const chosen = interaction.options.getString('instelling');
        if (chosen && !paths().includes(chosen)) throw new Error('Kies een geldige instelling uit de lijst.');
        if (chosen) state.current = chosen;
        else if (!paths().includes(state.current)) next(state);
        progress.save(guildId, state);
        return send(interaction, 'editReply', view(guildId, state));
    } catch (error) {
        return send(interaction, 'editReply', { content: `❌ ${error.message}\nControleer bij een Discord-rechtenfout het recht Bijnamen wijzigen.`, allowedMentions: { parse: [] } });
    } finally { busy.delete(guildId); }
}
async function execute(client, interaction) {
    if (!await authorize(interaction)) return;
    const guildId = interaction.guild.id;
    const [, revision, action] = interaction.customId.split(':');
    if (busy.has(guildId)) return send(interaction, 'reply', { content: 'Er wordt al een wijziging verwerkt. Probeer het opnieuw.', flags: MessageFlags.Ephemeral });
    busy.add(guildId);
    try {
        const state = progress.get(guildId);
        if (Number(revision) !== state.revision) return send(interaction, 'reply', { content: pair('Dit scherm is verouderd. Open /gebruikersnaam opnieuw.', 'This screen is outdated. Reopen /gebruikersnaam.'), flags: MessageFlags.Ephemeral });
        const path = state.current;
        if (action === 'edit' && path && !extraSteps[path]) {
            const value = settings.getPath(settings.getGuildConfig(guildId), path);
            const input = new TextInputBuilder().setCustomId('value').setLabel(path.slice(0, 45)).setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(4000);
            const text = typeof value === 'string' ? value : JSON.stringify(value);
            if (text?.length > 4000) throw new Error('Deze waarde is te lang voor een formulier. Gebruik /config instellen.');
            if (text) input.setValue(text);
            return send(interaction, 'showModal', new ModalBuilder().setCustomId(`installation:${revision}:save`).setTitle(pair('Instelling wijzigen', 'Edit setting')).addComponents(new ActionRowBuilder().addComponents(input)));
        }
        await interaction.deferUpdate();
        let notice = '';
        if (action === 'retry') { state.skipped = []; next(state); }
        else if (path && ['save', 'keep', 'skip'].includes(action)) {
            if (action === 'save') {
                if (extraSteps[path]) throw new Error('Gebruik het bijbehorende command.');
                const raw = interaction.fields.getTextInputValue('value');
                if (path === 'Bot.Name') await rename(client, interaction, raw);
                else settings.updateValue(guildId, path, raw);
                // Persist completion before optional synchronization so a failed refresh never loses progress.
            }
            state.done = state.done.filter(p => p !== path);
            state.skipped = state.skipped.filter(p => p !== path);
            (action === 'skip' ? state.skipped : state.done).push(path);
            next(state);
        } else throw new Error('Onbekende installatiestap.');
        progress.save(guildId, state);
        if (action === 'save') {
            try {
                if (path.startsWith('Honeypot.') || path === 'Roles.Verified') notice = await require('./honeypotWarning').syncWarning(interaction.guild);
                if (path === 'Bump.Channel') await require('./bumpReminder').tick(client);
            } catch (error) { notice = `Opgeslagen; verversen mislukt: ${error.message}`; }
        }
        return send(interaction, 'editReply', view(guildId, state, notice));
    } catch (error) {
        return send(interaction, interaction.deferred ? 'followUp' : 'reply', { content: `❌ ${error.message}`, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
    } finally { busy.delete(guildId); }
}
module.exports = { open, execute, allowed, validateName, paths, next, view, rename };
