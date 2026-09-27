const DEFAULT_WELCOME_MESSAGE = '👋 Welkom {gebruiker} bij **{server}**!\n\n' +
    '**Aantal leden:** {ledenaantal}\n' +
    'Lees eerst de regels en verifieer jezelf om toegang te krijgen.';

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
    const source = getWelcomeTemplate(template);
    return source.replace(/\{(gebruiker|gebruikersnaam|server|ledenaantal|gebruikersid|serverid)\}/gi,
        (_, key) => values[key.toLowerCase()]).slice(0, 4000);
}

module.exports = { renderWelcome, getWelcomeTemplate, DEFAULT_WELCOME_MESSAGE };
