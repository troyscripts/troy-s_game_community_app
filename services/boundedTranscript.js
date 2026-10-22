const transcripts = require('discord-html-transcripts');
const { AttachmentBuilder } = require('discord.js');
const MAX_MESSAGES = 5000;
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
let active = false;
function fail(message) { const error = new Error(message); error.ticketInput = true; throw error; }
async function createTranscript(channel, options = {}) {
    if (active) fail('Er wordt al een transcript verwerkt. Probeer het straks opnieuw. Het ticket blijft behouden.');
    active = true;
    try {
        const messages = [];
        let before, bytes = 0;
        const deadline = Date.now() + 60000;
        for (;;) {
            if (Date.now() > deadline) fail('Transcript ophalen duurt te lang. Het ticket blijft behouden; probeer het later opnieuw.');
            const batch = await channel.messages.fetch({limit:100, ...(before ? {before} : {}), cache:false});
            if (!batch.size) break;
            for (const message of batch.values()) {
                bytes += Buffer.byteLength(JSON.stringify(message.toJSON()));
                messages.push(message);
                if (messages.length > MAX_MESSAGES || bytes > MAX_SOURCE_BYTES)
                    fail('Dit ticket is te groot voor automatische export (maximaal 5000 berichten of 8 MB berichtgegevens per kanaal). Laat de beheerder het volledig archiveren. Het ticket blijft behouden.');
            }
            const next = batch.last().id;
            if (next === before) fail('Transcript ophalen kon niet worden afgerond. Het ticket blijft behouden.');
            before = next;
        }
        const buffer = await transcripts.generateFromMessages(messages.reverse(), channel, {
            ...options, returnType:'buffer', saveImages:false, hydrate:false
        });
        if (buffer.length > MAX_OUTPUT_BYTES) fail('Het transcriptbestand is groter dan 8 MB. Laat de beheerder het archiveren. Het ticket blijft behouden.');
        return options.returnType === 'buffer' ? buffer : new AttachmentBuilder(buffer, {name:options.filename || 'transcript.html'});
    } finally { active = false; }
}
module.exports = { createTranscript };
