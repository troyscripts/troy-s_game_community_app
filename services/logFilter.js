'use strict';
// Only message logging is filtered; moderation, honeypot and audit actions remain active.
function source(message, previous) {
    const author = message?.author || previous?.author;
    const text = `${previous?.content || ''}\n${message?.content || ''}`;
    const ids = kind => [...new Set([
        ...[...(previous?.mentions?.[kind]?.keys?.() || [])],
        ...[...(message?.mentions?.[kind]?.keys?.() || [])],
        ...[...text.matchAll(kind === 'roles' ? /<@&(\d{17,20})>/g : /<@!?(\d{17,20})>/g)].map(m => m[1])
    ])];
    return {authorId: author?.id || null, bot: Boolean(author?.bot || message?.webhookId || previous?.webhookId), users: ids('users'), roles: ids('roles')};
}
function ignored(value, logging = {}) {
    if (!value) return false;
    return Boolean((logging.IgnoreBots && value.bot)
        || logging.IgnoredAuthors?.includes(value.authorId)
        || value.users?.some(id => logging.IgnoredUserMentions?.includes(id))
        || value.roles?.some(id => logging.IgnoredRoleMentions?.includes(id)));
}
function pinTime(value) {
    if (value == null || value === '') return 'onbekend';
    if (!(value instanceof Date) && typeof value !== 'number' && typeof value !== 'string') return 'onbekend';
    const date = value instanceof Date ? value : new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : 'onbekend';
}
module.exports = {source, ignored, pinTime};
