const { tr, send, sendLogMessage } = require("../utils/localization");
const fs = require('node:fs/promises');
const path = require('node:path');
const { AttachmentBuilder } = require('discord.js');
const transcripts = require('./boundedTranscript');
const config = require('../config/config');
const tickets = require('../database/tickets');
const logger = require('../utils/logger');

function archiveError(text){const error=new Error(tr(text));error.ticketInput=true;return error;}

async function fetchArchiveChannel(channel, id, label, missingAllowed = false) {
    try {
        const found = await channel.guild.channels.fetch(id, { force: true });
        if (!found && !missingAllowed) throw archiveError(`${label} (${id}) ontbreekt. Het ticket is behouden.`);
        return found;
    } catch (error) {
        if (Number(error.code) === 10003 && missingAllowed) return null;
        if (error.ticketInput) throw error;
        throw archiveError(`${label} (${id}) kon niet worden opgehaald (Discord ${error.code || 'onbekend'}). Controleer het kanaal en de botrechten. Het ticket is behouden.`);
    }
}
async function deliverThreadTranscript(channel,ticket) {
    if(!ticket.staff_thread_id)return;
    const id=config.Tickets.ThreadLogChannel;
    if(!id || id===config.Tickets.LogChannel || id===channel.id || id===ticket.staff_thread_id)
        throw archiveError('Stel eerst een apart stafflog in met /config instellen instelling:Tickets.ThreadLogChannel waarde:#ticket-thread-logs. Kies een ander kanaal dan Tickets.LogChannel. Het ticket is behouden.');
    const log=await fetchArchiveChannel(channel,id,'Staffthread-logkanaal');
    if(!log?.isTextBased() || log.guild.id!==ticket.guild_id)throw archiveError('Het staffthread-logkanaal is niet bereikbaar. Het ticket is behouden. Controleer Tickets.ThreadLogChannel en de botrechten.');
    const thread=await fetchArchiveChannel(channel,ticket.staff_thread_id,'Opgeslagen staffthread',true);
    if (!thread) {
        const filename=`staff-thread-missing-${channel.id}-${ticket.staff_thread_id}.txt`;
        const notice=tr('De opgeslagen staffthread {0} van ticket {1} bestaat niet meer. Het staffoverleg kon niet worden teruggehaald. Het ticketgesprek wordt afzonderlijk bewaard.',ticket.staff_thread_id,channel.id);
        const directory=path.resolve(__dirname,'..','transcripts',ticket.guild_id,'staff');
        await fs.mkdir(directory,{recursive:true});
        await fs.writeFile(path.join(directory,filename),`${new Date().toISOString()}\n${notice}\n`);
        await sendLogMessage(log,'send',{content:notice,allowedMentions:{parse:[]}});
        logger.warn(`Ticket ${channel.id}: staffthread ${ticket.staff_thread_id} ontbreekt; vastgelegd in stafflog ${id}.`);
        return { missing: true };
    }
    if(!thread || thread.parentId!==channel.id || thread.type!==require('discord.js').ChannelType.PrivateThread)
        throw archiveError('De opgeslagen staffthread ontbreekt of hoort niet bij dit ticket.');
    const filename=`staff-thread-${channel.id}-${thread.id}-${Date.now()}.html`;
    const buffer=await transcripts.createTranscript(thread,{limit:-1,returnType:'buffer',filename});
    const directory=path.resolve(__dirname,'..','transcripts',ticket.guild_id,'staff');
    await fs.mkdir(directory,{recursive:true});
    await fs.writeFile(path.join(directory,filename),buffer);
    // Never reuse the owner's DM payload for confidential staff discussion.
    await sendLogMessage(log,'send',{
        content:tr('💬 Staffthread-transcript voor ticket <#{0}>. Alleen voor staff.',channel.id),
        files:[new AttachmentBuilder(buffer,{name:filename})],allowedMentions:{parse:[]}
    });
}
async function deliverTranscript(client, channel, ticket) {
    const staffArchive = await deliverThreadTranscript(channel,ticket);
    // Only fetch the parent channel: private staff threads never enter this export.
    const filename = `ticket-${channel.id}-${Date.now()}.html`;
    const buffer = await transcripts.createTranscript(channel, { limit: -1, returnType: 'buffer', filename });
    const directory = path.resolve(__dirname, '..', 'transcripts', ticket.guild_id);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, filename), buffer);
    const payload = () => ({
        content: tr("📄 Transcript van je ticket #{0} in {1}.", channel.name, channel.guild.name),
        files: [new AttachmentBuilder(buffer, { name: filename })], allowedMentions: { parse: [] }
    });
    let dmSent = Boolean(ticket.transcript_dm_sent_at);
    if (!dmSent) {
        try {
            const owner = await client.users.fetch(ticket.user_id);
            await send(owner, "send", payload());
            tickets.markTranscriptSent(channel.id);
            dmSent = true;
        } catch (error) { logger.error(`Transcript-DM voor ticket ${channel.id} mislukt: ${error.message}`); }
    }
    let logged = false;
    try {
        const log = config.Tickets.LogChannel ? await channel.guild.channels.fetch(config.Tickets.LogChannel) : null;
        if (log?.isTextBased()) {
            await sendLogMessage(log, "send", { ...payload(), content: tr("📄 Ticket <#{0}> | eigenaar <@{1}>\n{2}", channel.id, ticket.user_id, dmSent ? tr("✅ Transcript via DM afgeleverd (eventueel bij eerder sluiten).") : tr("⚠️ DM mislukt. Lokale kopie bewaard; geef het transcript handmatig aan de eigenaar.")) });
            logged = true;
        }
    } catch (error) { logger.error(`Transcriptlog voor ticket ${channel.id} mislukt: ${error.message}`); }
    return { dmSent, logged, staffThreadMissing: Boolean(staffArchive?.missing) };
}
module.exports = { deliverTranscript, deliverThreadTranscript };
