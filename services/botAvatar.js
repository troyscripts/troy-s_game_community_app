const { Routes } = require('discord.js');
const avatars = require('../database/botAvatars');
const MAX_BYTES = 2 * 1024 * 1024;
const working = new Set();
function imageType(buffer) {
    if (buffer.length >= 24 && buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
    if (buffer.length >= 4 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return 'image/jpeg';
    if (buffer.length >= 13 && ['GIF87a','GIF89a'].includes(buffer.subarray(0,6).toString('ascii'))) return 'image/gif';
    throw new Error('Upload een PNG-, JPG- of GIF-afbeelding.');
}
async function downloadImage(attachment) {
    if (!attachment || attachment.size > MAX_BYTES || attachment.size <= 0) throw new Error('Upload een afbeelding van maximaal 2 MB.');
    const url = new URL(attachment.url);
    // Accept regular uploads and temporary slashcommand attachments.
    if (url.protocol !== 'https:' || !['cdn.discordapp.com','media.discordapp.net'].includes(url.hostname) || url.port || url.username || url.password || !/^\/(?:attachments|ephemeral-attachments)\//.test(url.pathname)) {
        throw new Error('Upload de afbeelding als Discord-bijlage bij dit command.');
    }
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (!response.ok || !response.body) throw new Error('De afbeelding kon niet worden gedownload. Upload deze opnieuw.');
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    try {
        for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > MAX_BYTES) throw new Error('De afbeelding is groter dan 2 MB.');
            chunks.push(Buffer.from(value));
        }
    } finally { await reader.cancel().catch(()=>{}); reader.releaseLock(); }
    const buffer = Buffer.concat(chunks);
    return { buffer, mime: imageType(buffer) };
}
async function change(client, guildId, userId, image) {
    if (working.has(guildId)) throw new Error('Er wordt al een profielfoto voor deze server verwerkt. Probeer het zo opnieuw.');
    working.add(guildId);
    try {
        avatars.ensure();
        const avatar = image ? `data:${image.mime};base64,${image.buffer.toString('base64')}` : null;
        // Deliberately use the guild-member endpoint, never the global bot user.
        await client.rest.patch(Routes.guildMember(guildId, '@me'), { body: { avatar }, reason: `Serverprofielfoto gewijzigd door ${userId}` });
        try {
            if (image) avatars.save(guildId,image.buffer,image.mime,userId);
            else avatars.remove(guildId);
        } catch (error) {
            throw new Error(`Discord heeft de foto aangepast, maar opslaan in de database is mislukt. Voer het command opnieuw uit. (${error.message})`);
        }
    } finally { working.delete(guildId); }
}
module.exports = { downloadImage, change, imageType, MAX_BYTES };
