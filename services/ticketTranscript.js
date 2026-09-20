const fs = require('node:fs/promises');
const path = require('node:path');
const { AttachmentBuilder } = require('discord.js');
const transcripts = require('discord-html-transcripts');
const config = require('../config/config');
const tickets = require('../database/tickets');
const logger = require('../utils/logger');

async function deliverTranscript(client, channel, ticket) {
    // Only fetch the parent channel: private staff threads never enter this export.
    const filename = `ticket-${channel.id}-${Date.now()}.html`;
    const buffer = await transcripts.createTranscript(channel, { limit: -1, returnType: 'buffer', filename });
    const directory = path.resolve(__dirname, '..', 'transcripts', ticket.guild_id);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, filename), buffer);
    const payload = () => ({
        content: `📄 Transcript van je ticket #${channel.name} in ${channel.guild.name}.`,
        files: [new AttachmentBuilder(buffer, { name: filename })], allowedMentions: { parse: [] }
    });
    let dmSent = Boolean(ticket.transcript_dm_sent_at);
    if (!dmSent) {
        try {
            const owner = await client.users.fetch(ticket.user_id);
            await owner.send(payload());
            tickets.markTranscriptSent(channel.id);
            dmSent = true;
        } catch (error) { logger.error(`Transcript-DM voor ticket ${channel.id} mislukt: ${error.message}`); }
    }
    let logged = false;
    try {
        const log = config.Tickets.LogChannel ? await channel.guild.channels.fetch(config.Tickets.LogChannel) : null;
        if (log?.isTextBased()) {
            await log.send({ ...payload(), content: `📄 Ticket <#${channel.id}> | eigenaar <@${ticket.user_id}>\n${dmSent ? '✅ Transcript via DM afgeleverd (eventueel bij eerder sluiten).' : '⚠️ DM mislukt. Lokale kopie bewaard; geef het transcript handmatig aan de eigenaar.'}` });
            logged = true;
        }
    } catch (error) { logger.error(`Transcriptlog voor ticket ${channel.id} mislukt: ${error.message}`); }
    return { dmSent, logged };
}
module.exports = { deliverTranscript };
