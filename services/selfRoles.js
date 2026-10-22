const { tr, send } = require("../utils/localization");
const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder,
    TextInputStyle, MessageFlags, PermissionFlagsBits: P } = require("../utils/discord");
const store = require('../database/selfRoles');
const config = require('../config/config');
const { hasOwnerAccess } = require('../utils/permissions');
const { isBotOwner } = require('../utils/botIdentity');
const { sendLog, eventEmbed } = require('../utils/eventEmbeds');
const logger = require('../utils/logger');
class InputError extends Error {}
const fail = text => { throw new InputError(text); };
const locks = new Map();
async function locked(key, fn) {
    const previous = locks.get(key) || Promise.resolve();
    const next = previous.catch(() => {}).then(fn);
    locks.set(key, next);
    try { return await next; } finally { if (locks.get(key) === next) locks.delete(key); }
}
async function audit(i, action, details) {
    store.audit(i.guildId, i.user.id, action, details);
    logger.event(`Selfrollen | server=${i.guildId} | gebruiker=${i.user.id} | ${action} | ${details.replace(/[\r\n]/g, ' ')}`);
    await sendLog(i.guild, eventEmbed(tr("Selfrollen: {0}", action), 0x3498DB,
        tr("**Door:** <@{0}>\n**Kanaal:** <#{1}>\n{2}", i.user.id, i.channelId, details),
        tr("Server: {0} | Gebruiker: {1}", i.guildId, i.user.id)));
}
async function admin(i) {
    const member = await i.guild.members.fetch({ user: i.user.id, force: true });
    if (!hasOwnerAccess(member, i.user.id) && !member.permissions.has(P.Administrator)) fail(tr("Alleen Owner, Developer of Administrator kan selfrollen beheren."));
    return member;
}
function panel(i, id) {
    const p = store.get(i.guildId, id);
    if (!p) fail(tr("Dit paneel bestaat niet in deze server. Gebruik /selfrollen lijst."));
    return p;
}
async function roleCheck(i, id, manager = null) {
    const role = await i.guild.roles.fetch(id);
    if (!role || role.id === i.guildId || role.managed) fail(tr("Deze rol bestaat niet of kan niet als selfrol worden gebruikt."));
    const reserved = [config.Roles?.Owner, config.Roles?.Developer, config.Roles?.Admin, config.Roles?.HeadAdmin, config.Roles?.Moderator, config.Roles?.HeadModerator, ...(config.StaffRoles || [])];
    const dangerous = [P.Administrator, P.ManageGuild, P.ManageRoles, P.ManageChannels, P.KickMembers,
        P.BanMembers, P.ModerateMembers, P.ManageMessages, P.ManageWebhooks];
    if (reserved.includes(id) || dangerous.some(bit => role.permissions.has(bit))) fail(tr("Beheer- en staffrollen kunnen niet als openbare selfrol worden gebruikt."));
    const me = await i.guild.members.fetchMe();
    if (!me.permissions.has(P.ManageRoles) || me.roles.highest.comparePositionTo(role) <= 0) fail(tr("De bot heeft Rollen beheren nodig en zijn hoogste rol moet boven deze selfrol staan."));
    if (manager && !isBotOwner(manager.id) && manager.id !== i.guild.ownerId && manager.roles.highest.comparePositionTo(role) <= 0) fail(tr("Je kunt alleen selfrollen onder je eigen hoogste rol instellen."));
    return role;
}
function payload(p) {
    const rows = [];
    p.buttons.forEach((b, n) => {
        if (n % 5 === 0) rows.push(new ActionRowBuilder());
        const button = new ButtonBuilder().setCustomId(`selfroles:${p.id}:${b.role}`)
            .setLabel(b.label).setStyle(b.style);
        if (b.emoji) button.setEmoji(b.emoji);
        rows.at(-1).addComponents(button);
    });
    return { content: null, embeds: [new EmbedBuilder().setColor(config.Bot.Color)
        .setTitle(p.title).setDescription(p.description)], components: rows, allowedMentions: { parse: [] } };
}
async function sync(i, p, remove = false) {
    let failed = 0;
    for (const ref of store.messages(i.guildId, p.id)) {
        try {
            const channel = await i.guild.channels.fetch(ref.channel_id);
            if (!channel?.messages) throw new Error(tr("Kanaal niet beschikbaar"));
            const message = await channel.messages.fetch(ref.message_id);
            await send(message, "edit", remove ? { components: [] } : payload(p));
            if (remove) store.untrack(i.guildId, ref.message_id);
        } catch (e) {
            if ([10003, 10008].includes(e.code)) store.untrack(i.guildId, ref.message_id);
            else { failed++; logger.warn(`Selfrollen synchroniseren: ${ref.message_id}: ${e.message}`); }
        }
    }
    return failed;
}
function resultText(failed) {
    return failed ? tr(" ⚠️ {0} bericht(en) konden niet worden bijgewerkt. Controleer de kanaalrechten en gebruik /selfrollen verversen.", failed) : '';
}
async function guarded(i, fn) {
    if (!i.guild) return send(i, "reply", { content: tr("Dit werkt alleen in een server."), flags: MessageFlags.Ephemeral });
    if (!i.deferred && !i.replied) await i.deferReply({ flags: MessageFlags.Ephemeral });
    return locked(i.guildId, async () => {
        try { return await fn(); }
        catch (e) {
            logger.error(`Selfrollen: ${e.stack || e}`);
            await audit(i, tr("Actie mislukt"), e instanceof InputError ? e.message : tr("Discord/database-fout ({0}).", e.code || tr("onbekend"))).catch(() => {});
            return send(i, "editReply", { content: `❌ ${e instanceof InputError ? e.message : tr("Actie mislukt. Controleer de botrechten en logs.")}`, allowedMentions: { parse: [] } });
        }
    });
}
function textModal(i, p, name) {
    const modal = new ModalBuilder().setCustomId(`selfroles_text:${p?.id || 'new'}:${i.user.id}:${name || ''}`).setTitle(p ? tr("Selfroltekst aanpassen") : tr("Selfrolpaneel maken"));
    const title = new TextInputBuilder().setCustomId('title').setLabel(tr("Titel")).setStyle(TextInputStyle.Short).setMaxLength(256).setRequired(true).setValue(p?.title || tr("Kies jouw rollen"));
    const description = new TextInputBuilder().setCustomId('description').setLabel(tr("Tekst boven de knoppen (Markdown mogelijk)")).setStyle(TextInputStyle.Paragraph).setMaxLength(4000).setRequired(true).setValue(p?.description || tr("Klik op een knop om een rol toe te voegen of te verwijderen."));
    return send(i, "showModal", modal.addComponents(new ActionRowBuilder().addComponents(title), new ActionRowBuilder().addComponents(description)));
}
async function modal(_client, i) {
    return guarded(i, async () => {
        await admin(i);
        const [, id, owner, name] = i.customId.split(':');
        if (owner !== i.user.id) fail(tr("Dit formulier is niet van jou."));
        const title = i.fields.getTextInputValue('title').trim();
        const description = i.fields.getTextInputValue('description').trim();
        if (!title || !description) fail(tr("Vul een titel en tekst in."));
        let p;
        if (id === 'new') {
            if (!/^[a-z0-9_-]{1,32}$/.test(name)) fail(tr("Ongeldige paneelnaam."));
            if (store.list(i.guildId).some(x => x.name === name)) fail(tr("Deze paneelnaam bestaat al."));
            p = panel(i, store.create(i.guildId,name,title,description));
        } else { p = panel(i,id); p.title = title; p.description = description; store.save(p); }
        const failed = await sync(i,p);
        await audit(i, id === 'new' ? tr("Paneel gemaakt") : tr("Tekst gewijzigd"), tr("Paneel {0} (#{1})\n**Titel:** {2}\n**Tekst:** {3}\nNiet bijgewerkt: {4}", p.name, p.id, title, description, failed));
        await send(i, "editReply", tr("✅ Paneel **{0}** (#{1}) opgeslagen.{2} Gebruik /selfrollen knop en daarna /selfrollen plaatsen.", p.name, p.id, resultText(failed)));
    });
}
async function toggle(i, roleId, source) {
    const role = await roleCheck(i, roleId);
    const member = await i.guild.members.fetch({ user: i.user.id, force: true });
    const remove = member.roles.cache.has(roleId);
    await member.roles[remove ? 'remove' : 'add'](role, tr("Selfrollen: {0}", source));
    await audit(i, remove ? tr("Rol verwijderd") : tr("Rol toegevoegd"), tr("**Rol:** <@&{0}> ({1})\n**Paneel:** {2}\n**Bericht:** {3}", roleId, roleId, source, i.message.id));
    return send(i, "editReply", { content: tr("✅ Rol **{0}** {1}.", role.name, remove ? tr("verwijderd") : tr("toegevoegd")), allowedMentions: { parse: [] } });
}
async function button(_client, i) {
    return guarded(i, async () => {
        const [, id, role] = i.customId.split(':');
        const p = panel(i,id);
        const ref = store.message(i.guildId,i.message.id);
        if (!ref || ref.panel_id !== p.id || ref.channel_id !== i.channelId || !p.buttons.some(b => b.role === role)) fail(tr("Deze knop is niet meer actief. Gebruik het actuele selfrolpaneel."));
        return toggle(i,role,`${p.name} (#${p.id})`);
    });
}
module.exports = { store, fail, admin, panel, roleCheck, payload, sync, resultText, guarded, audit, textModal, modal, button, toggle };
