const { tr, clip, render, pair } = require("./localization");
const LOCALIZED_DEFAULT = tr("👋 Welkom {gebruiker} bij **{server}**!\n\n") +
    tr("**Aantal leden:** {ledenaantal}\n") +
    tr("Lees eerst de regels en verifieer jezelf om toegang te krijgen.");

const DEFAULT_WELCOME_MESSAGE = render(LOCALIZED_DEFAULT, 'nl');

function getWelcomeTemplate(template) {
    return typeof template === 'string' && template.trim()
        ? template
        : DEFAULT_WELCOME_MESSAGE;
}

function renderWelcome(template, member) {
    const values = {
        gebruiker: `<@${member.id}>`,
        gebruikersnaam: member.user.username,
        server: member.guild.name,
        ledenaantal: String(member.guild.memberCount),
        gebruikersid: member.id,
        serverid: member.guild.id
    };
    let source = getWelcomeTemplate(template);
    if (source === DEFAULT_WELCOME_MESSAGE) source = LOCALIZED_DEFAULT;
    const english = require('../database/welcomeTranslations').get(member.guild.id, template || '');
    if (english) source = pair(render(source, 'nl'), english);
    return clip(source.replace(/\{(gebruiker|gebruikersnaam|server|ledenaantal|gebruikersid|serverid)\}/gi,
        (_, key) => values[key.toLowerCase()]), 4000);
}

module.exports = { renderWelcome, getWelcomeTemplate, DEFAULT_WELCOME_MESSAGE };
