const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'government-close-'));
const config=require('../config/defaults');config.Database.File=path.join(tmp,'test.sqlite');config.Logging.Enabled=false;
const {db}=require('../database/database');
const store=require('../database/governmentTickets');
const transcripts=require('../services/boundedTranscript');
const {closeTicket}=require('../services/governmentClose');
const ticket={channel:'ticket',guild:'guild',service:'politie',department:'0',owner:'owner',access:JSON.stringify({roles:[],users:['handler']})};
store.add(ticket);
const order=[];
let failExport=false,failSend=false,failDelete=false,logGuild='guild',permissions=true;
transcripts.createTranscript=async()=>{order.push('export');if(failExport)throw Error('export failed');return {attachment:Buffer.from('html'),name:'test.html'};};
const log={get guildId(){return logGuild;},isTextBased:()=>true,permissionsFor:()=>({has:()=>permissions}),send:async payload=>{order.push('send');assert.equal(payload.files.length,1);assert.deepEqual(payload.allowedMentions,{parse:[]});if(failSend)throw Error('send failed');}};
const channel={id:'ticket',name:'politie-test',permissionsFor:()=>({has:()=>true}),delete:async()=>{order.push('delete');if(failDelete)throw Error('delete failed');}};
const i={guildId:'guild',user:{id:'handler'},channel,guild:{members:{fetchMe:async()=>({id:'bot'})},roles:{fetch:async()=>new Map()},channels:{fetch:async()=>log}}};
async function fails(pattern,steps) {
 order.length=0;await assert.rejects(closeTicket(i,ticket),pattern);assert.deepEqual(order,steps);assert.equal(store.ticket('guild','ticket').status,'open');
}
(async()=>{
 config.Tickets.LogChannel='';await fails(/ontbreekt/,[]);
 config.Tickets.LogChannel='ticket';await fails(/verwijst/,[]);
 config.Tickets.LogChannel='log';logGuild='other';await fails(/deze server/,[]);logGuild='guild';
 permissions=false;await fails(/bijvoegen/,[]);permissions=true;
 failExport=true;await fails(/export failed/,['export']);failExport=false;
 failSend=true;await fails(/send failed/,['export','send']);failSend=false;
 failDelete=true;await fails(/delete failed/,['export','send','delete']);failDelete=false;
 order.length=0;await closeTicket(i,ticket);assert.deepEqual(order,['export','send','delete']);assert.equal(store.ticket('guild','ticket').status,'deleted');
 console.log('PASS: missing/wrong log, same-channel log, cross-server log, permissions, export/upload/delete failures, retry with fresh transcript and ordered log-before-delete.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{db.close();fs.rmSync(tmp,{recursive:true,force:true});});
