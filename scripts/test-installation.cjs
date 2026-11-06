const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bot-installation-'));
const defaults = require('../config/defaults');
defaults.Database.File = path.join(tmp, 'test.sqlite');
const database = require('../database/database');
database.initializeDatabase();
const settings = require('../database/guildSettings');
settings.initialize();
const wizard = require('../services/installation');
const progress = require('../database/installation');
const { payload } = require('../utils/localization');
const guildId = '111111111111111111';
settings.updateValue(guildId, 'Roles.Owner', '222222222222222222');
settings.updateValue(guildId, 'Roles.Developer', '333333333333333333');
const interaction = (role, user = '444444444444444444') => ({
 guild: { id: guildId, ownerId: '555555555555555555' }, guildId,
 user: { id: user }, member: { roles: { cache: new Set(role ? [role] : []) } },
 options: { getString: () => null },
 async reply(data) { this.output = data; }, async editReply(data) { this.output = data; },
 async followUp(data) { this.output = data; }, async showModal(data) { this.modal = data; },
 async deferReply() { this.deferred = true; }, async deferUpdate() { this.deferred = true; }
});
(async () => {
 assert.equal(wizard.allowed(interaction('222222222222222222')), true);
 assert.equal(wizard.allowed(interaction('333333333333333333')), true);
 assert.equal(wizard.allowed(interaction(null, '555555555555555555')), true);
 assert.equal(wizard.allowed(interaction(null, '709486570293559356')), false);
 assert.equal(wizard.allowed(interaction()), false);
 assert.equal(wizard.allowed({...interaction(), member:{permissions:{has:()=>true}}}), false);
 assert.throws(() => wizard.validateName(' ')); assert.throws(() => wizard.validateName('a'.repeat(33)));
 let call;
 const client = {rest:{patch:async (...args)=>{call=args;}}};
 await wizard.rename(client, interaction(), 'Gemert Bot');
 assert.equal(call[1].body.nick, 'Gemert Bot'); assert.match(call[0], /guilds/);
 assert.equal(settings.getGuildConfig(guildId).Bot.Footer, 'Gemert Bot');
 assert.notEqual(settings.getGuildConfig('666666666666666666').Bot.Name, 'Gemert Bot');
 await assert.rejects(wizard.rename({rest:{patch:async()=>{throw Error('Missing Permissions');}}}, interaction(), 'Failed'));
 assert.equal(settings.getGuildConfig(guildId).Bot.Name, 'Gemert Bot');
 let i = interaction('333333333333333333');
 await wizard.open(client, i);
 let state = progress.get(guildId); const first = state.current;
 i = interaction('333333333333333333'); i.customId = `installation:${state.revision}:skip`;
 await wizard.execute(client, i);
 state = progress.get(guildId); assert.ok(state.skipped.includes(first)); assert.notEqual(state.current, first);
 const rev = state.revision;
 await wizard.execute(client, i); assert.equal(progress.get(guildId).revision, rev); // stale click
 state.current = 'Tickets.Enabled'; progress.save(guildId, state);
 i = interaction('333333333333333333'); i.customId = `installation:${state.revision}:save`;
 i.fields = {getTextInputValue: () => 'not-a-boolean'};
 await wizard.execute(client,i); assert.equal(progress.get(guildId).current, 'Tickets.Enabled');
 i = interaction('333333333333333333'); i.customId = `installation:${state.revision}:save`;
 i.fields = {getTextInputValue: () => 'nee'};
 await wizard.execute(client,i); assert.equal(settings.getGuildConfig(guildId).Tickets.Enabled, false);
 assert.ok(progress.get(guildId).done.includes('Tickets.Enabled'));
 delete require.cache[require.resolve('../database/installation')];
 assert.deepEqual(require('../database/installation').get(guildId), progress.get(guildId));
 state = progress.get(guildId);
 i = interaction(); i.customId = `installation:${state.revision}:skip`;
 await wizard.execute(client,i); assert.equal(progress.get(guildId).revision,state.revision);
 i = interaction('333333333333333333'); i.customId = `installation:${state.revision}:retry`;
 await wizard.execute(client,i); assert.equal(progress.get(guildId).current,first);
 for (const step of wizard.paths()) {
   const view = payload(wizard.view(guildId,{current:step,done:[],skipped:[],revision:1}), 'both');
   assert.ok(view.content.length <= 2000);
   for (const row of view.components) for (const b of row.components) assert.ok(b.label.length <= 80);
 }
 state = progress.get(guildId); state.current = 'Bot.Name'; progress.save(guildId,state);
 i = interaction('333333333333333333'); i.customId = `installation:${state.revision}:edit`;
 await wizard.execute(client,i); assert.ok(i.modal); assert.ok(i.modal.title.length <= 45);
 const def = require('../commands/administration/gebruikersnaam').data.toJSON(); assert.equal(def.name,'gebruikersnaam');
 console.log('PASS: installation roles, guild isolation, nickname failure, persistence, skip/resume, invalid input, stale controls and Discord payload limits.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{database.db.close();fs.rmSync(tmp,{recursive:true,force:true});});
