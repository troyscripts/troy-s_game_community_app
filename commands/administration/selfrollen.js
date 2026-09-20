const { SlashCommandBuilder, ChannelType, MessageFlags } = require('discord.js');
const s = require('../../services/selfRoles');
const choose = sub => sub.addStringOption(o => o.setName('paneel').setDescription('Kies een opgeslagen paneel').setRequired(true).setAutocomplete(true));
module.exports = {
    data: new SlashCommandBuilder().setName('selfrollen').setDescription('Beheer meerdere selfrolpanelen en rolknoppen')
        .setDefaultMemberPermissions(null)
        .addSubcommand(x => x.setName('maken').setDescription('Maak een paneel met een eigen titel en tekst')
            .addStringOption(o => o.setName('naam').setDescription('Unieke naam: kleine letters, cijfers, _ of -').setRequired(true).setMaxLength(32)))
        .addSubcommand(x => choose(x.setName('tekst').setDescription('Wijzig titel en tekst via een formulier')))
        .addSubcommand(x => choose(x.setName('knop').setDescription('Voeg een rolknop toe of wijzig een bestaande knop'))
            .addRoleOption(o => o.setName('rol').setDescription('Rol voor deze knop').setRequired(true))
            .addStringOption(o => o.setName('label').setDescription('Tekst op de knop').setRequired(true).setMaxLength(80))
            .addStringOption(o => o.setName('kleur').setDescription('Knopkleur').addChoices({name:'Blauw',value:'1'},{name:'Grijs',value:'2'},{name:'Groen',value:'3'},{name:'Rood',value:'4'}))
            .addStringOption(o => o.setName('emoji').setDescription('Emoji of <:naam:id>; gebruik geen om te wissen').setMaxLength(100)))
        .addSubcommand(x => choose(x.setName('knop-verwijderen').setDescription('Verwijder een rolknop uit dit paneel'))
            .addRoleOption(o => o.setName('rol').setDescription('Rol van de te verwijderen knop').setRequired(true)))
        .addSubcommand(x => choose(x.setName('plaatsen').setDescription('Plaats een extra paneel of vervang een bestaand selfrolbericht'))
            .addChannelOption(o => o.setName('kanaal').setDescription('Doelkanaal').setRequired(true).addChannelTypes(ChannelType.GuildText,ChannelType.GuildAnnouncement))
            .addStringOption(o => o.setName('bericht-id').setDescription('Optioneel: ID van een bestaand selfrolbericht van deze bot')))
        .addSubcommand(x => choose(x.setName('voorbeeld').setDescription('Bekijk dit paneel privé')))
        .addSubcommand(x => choose(x.setName('verversen').setDescription('Werk alle geplaatste exemplaren opnieuw bij')))
        .addSubcommand(x => choose(x.setName('verwijderen').setDescription('Verwijder een paneel en schakel zijn knoppen uit'))
            .addBooleanOption(o => o.setName('bevestigen').setDescription('Ja: paneel definitief verwijderen').setRequired(true)))
        .addSubcommand(x => x.setName('lijst').setDescription('Toon alle panelen in deze server'))
        .addSubcommand(x => x.setName('hulp').setDescription('Uitleg over selfrollen instellen')),
    category: 'Beheer', guildOnly: true, staffOnly: true, dmAllowed: false, cooldown: 1,
    async autocomplete(_client, i) {
        try {
            await s.admin(i);
            const q = String(i.options.getFocused()).toLowerCase();
            await i.respond(s.store.list(i.guildId).filter(p => p.name.includes(q) || String(p.id).includes(q))
                .slice(0,25).map(p => ({name:`${p.name} (#${p.id})`,value:String(p.id)})));
        } catch { await i.respond([]); }
    },
    async execute(_client, i) {
        const sub = i.options.getSubcommand();
        if (sub === 'maken' || sub === 'tekst') {
            // A modal must be the initial response. These checks make no mutations.
            try {
                await s.admin(i);
                if (sub === 'tekst') return await s.textModal(i, s.panel(i,i.options.getString('paneel')));
                const name = i.options.getString('naam').trim().toLowerCase();
                if (!/^[a-z0-9_-]{1,32}$/.test(name)) s.fail('Gebruik alleen kleine letters, cijfers, _ en - voor de naam.');
                if (s.store.list(i.guildId).some(p => p.name === name)) s.fail('Deze paneelnaam bestaat al.');
                return await s.textModal(i,null,name);
            } catch (e) { return s.guarded(i, async () => { throw e; }); }
        }
        return s.guarded(i, async () => {
            const manager = await s.admin(i);
            if (sub === 'hulp') return i.editReply('**Selfrollen instellen**\n1. `/selfrollen maken`: naam kiezen en titel/tekst invullen.\n2. `/selfrollen knop`: rol aanklikken, label, kleur en emoji instellen; herhaal voor meer knoppen.\n3. `/selfrollen plaatsen`: paneel en kanaal kiezen. Herhaal voor extra berichten.\n\n`tekst` en `knop` werken alle exemplaren direct bij. `knop-verwijderen` wist een knop. `verversen` probeert updates opnieuw. `lijst` toont panelen.\nBestaand standaardpaneel vervangen? Vul bij `plaatsen` ook zijn bericht-ID in.\nEen klik geeft de rol; nogmaals klikken verwijdert hem. Maximaal 25 knoppen per paneel. Beheer vereist Owner, Developer of Administrator.');
            if (sub === 'lijst') {
                const panels = s.store.list(i.guildId);
                const text = panels.map(p => `#${p.id} • ${p.name} • ${p.buttons.length} knoppen • ${s.store.messages(i.guildId,p.id).length} berichten`).join('\n');
                if (text.length > 1900) return i.editReply({content:'Alle selfrolpanelen:',files:[{attachment:Buffer.from(text),name:'selfrolpanelen.txt'}]});
                return i.editReply(text || 'Nog geen panelen. Begin met /selfrollen maken.');
            }
            const p = s.panel(i,i.options.getString('paneel'));
            if (sub === 'voorbeeld') return i.editReply({...s.payload(p), components:[],content:'Privévoorbeeld (knoppen hieronder als tekst):\n' + (p.buttons.map(b=>`${b.emoji || ''} ${b.label} → <@&${b.role}>`).join('\n') || 'Nog geen knoppen.')});
            if (sub === 'knop') {
                const role = i.options.getRole('rol');
                await s.roleCheck(i,role.id,manager);
                const old = p.buttons.find(b=>b.role === role.id);
                if (!old && p.buttons.length >= 25) s.fail('Dit paneel heeft al 25 knoppen. Maak een extra paneel.');
                const label = i.options.getString('label').trim();
                if (!label) s.fail('Vul een knoptekst in.');
                const emojiInput = i.options.getString('emoji');
                const emoji = emojiInput === 'geen' ? '' : (emojiInput ?? old?.emoji ?? '');
                if (emoji && !/^<a?:\w+:\d{17,20}>$/.test(emoji) && !/^(?:(?:\p{Extended_Pictographic}|\p{Regional_Indicator})[\uFE0F\p{Emoji_Modifier}]*(?:\u200D(?:\p{Extended_Pictographic})[\uFE0F\p{Emoji_Modifier}]*)*|[0-9#*]\uFE0F?\u20E3|\p{Regional_Indicator}{2})$/u.test(emoji)) s.fail('Gebruik één emoji of <:naam:id>, of geen om de emoji te wissen.');
                const b = {role:role.id,label,style:Number(i.options.getString('kleur') || old?.style || 1),emoji};
                if (old) p.buttons[p.buttons.indexOf(old)] = b; else p.buttons.push(b);
                s.payload(p); // Validate before persistence.
                s.store.save(p);
                const failed = await s.sync(i,p);
                await s.audit(i,old ? 'Knop gewijzigd' : 'Knop toegevoegd',`Paneel ${p.name} (#${p.id})\nRol <@&${role.id}>\n${JSON.stringify(b)}\nNiet bijgewerkt: ${failed}`);
                return i.editReply(`✅ Knop opgeslagen.${s.resultText(failed)}`);
            }
            if (sub === 'knop-verwijderen') {
                const role = i.options.getRole('rol');
                if (!p.buttons.some(b=>b.role === role.id)) s.fail('Deze rol heeft geen knop in dit paneel.');
                p.buttons = p.buttons.filter(b=>b.role !== role.id);
                s.store.save(p);
                const failed = await s.sync(i,p);
                await s.audit(i,'Knop verwijderd',`Paneel ${p.name} (#${p.id})\nRol <@&${role.id}>\nNiet bijgewerkt: ${failed}`);
                return i.editReply(`✅ Knop verwijderd. Bestaande ledenrollen blijven behouden.${s.resultText(failed)}`);
            }
            if (sub === 'plaatsen') {
                if (!p.buttons.length) s.fail('Voeg eerst minimaal één rolknop toe.');
                for (const b of p.buttons) await s.roleCheck(i,b.role,manager);
                const channel = i.options.getChannel('kanaal');
                if (channel.guildId !== i.guildId || !channel.send || !channel.permissionsFor(manager)?.has('ViewChannel')) s.fail('Je hebt geen toegang tot dit kanaal.');
                const id = i.options.getString('bericht-id');
                let message;
                if (id) {
                    if (!/^\d{17,20}$/.test(id)) s.fail('Vul een geldig bericht-ID in.');
                    message = await channel.messages.fetch(id);
                    const buttons = message.components.flatMap(row=>row.components || []);
                    const known = s.store.message(i.guildId,id);
                    const legacy = buttons.length && buttons.every(b=>b.customId?.startsWith('roles:'));
                    if (message.author.id !== i.client.user.id || (!known && !legacy)) s.fail('Alleen een bestaand selfrolbericht van deze bot kan worden vervangen.');
                    await message.edit({...s.payload(p), attachments:[]});
                } else message = await channel.send(s.payload(p));
                s.store.track(i.guildId,p.id,channel.id,message.id);
                await s.audit(i,id ? 'Paneel vervangen' : 'Paneel geplaatst',`Paneel ${p.name} (#${p.id})\nKanaal <#${channel.id}>\nBericht ${message.id}`);
                return i.editReply(`✅ Paneel ${id ? 'vervangen' : 'geplaatst'}: ${message.url}`);
            }
            if (sub === 'verversen') {
                const failed = await s.sync(i,p);
                await s.audit(i,'Paneel ververst',`Paneel ${p.name} (#${p.id})\nNiet bijgewerkt: ${failed}`);
                return i.editReply(`✅ Synchronisatie afgerond.${s.resultText(failed)}`);
            }
            if (sub === 'verwijderen') {
                if (!i.options.getBoolean('bevestigen')) s.fail('Kies bevestigen: Ja om dit paneel te verwijderen.');
                const failed = await s.sync(i,p,true);
                s.store.remove(i.guildId,p.id);
                await s.audit(i,'Paneel verwijderd',`Paneel ${p.name} (#${p.id})\nNiet bereikbare berichten: ${failed}`);
                return i.editReply(`✅ Paneel verwijderd; ledenrollen blijven behouden.${failed ? ` ${failed} bericht(en) waren niet bereikbaar; hun knoppen werken niet meer.` : ''}`);
            }
        });
    }
};
