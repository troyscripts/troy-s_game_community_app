const config = require('../config/config');
const logger = require('../utils/logger');
const { isBotOwner } = require('../utils/botIdentity');
const { settings } = require('../config/broadcast');
const transport = require('./broadcastTransport');
let active = null;
let startupError = null;

function guildIds(client) {
    return [...client.guilds.cache.keys()].filter(id =>
        config.__context.run(id, () => Boolean(config.Logging?.Channel)));
}
function validGuilds(value) {
    if (!Array.isArray(value) || value.length > 1000 || value.some(id => !/^\d{17,20}$/.test(id))) {
        throw new Error('Ongeldige serverlijst.');
    }
    return [...new Set(value)];
}
function handlerFor(store) {
    return async (botId, action, data) => {
        if (action === 'register') {
            store.register(botId, validGuilds(data.guildIds));
            return {ok:true};
        }
        if (action === 'claim') return store.claim(botId, validGuilds(data.guildIds));
        if (action === 'outstanding') return store.outstanding(botId);
        if (action === 'ack') {
            if (typeof data.token !== 'string' || data.token.length>100 ||
                !['sent','skipped','failed','uncertain'].includes(data.state) ||
                (data.discordId != null && !/^\d{17,20}$/.test(data.discordId)) ||
                (data.detail != null && typeof data.detail !== 'string')) throw new Error('Ongeldige ontvangstbevestiging.');
            return {ok:store.acknowledge(botId, data)};
        }
        // Publication deliberately has no network endpoint. Only the central
        // bot's locally verified owner interaction may create announcements.
        throw new Error('Onbekende actie.');
    };
}
async function flushReceipts(state) {
    for (const receipt of state.store.receipts()) {
        // The process stopped after reservation but before a certain outcome.
        // Never resend automatically: Discord may already have accepted it.
        if (receipt.state === 'sending') {
            state.store.finishReceipt(receipt.token, 'uncertain', null, 'Herstart tijdens verzending; controleer het botlogkanaal.');
            receipt.state = 'uncertain';
            receipt.detail = 'Herstart tijdens verzending; controleer het botlogkanaal.';
        }
        const result = await state.call('ack', receipt);
        if (result.ok) state.store.removeReceipt(receipt.token);
        else throw new Error('Ontvangstbevestiging past niet bij de centrale database; controleer je databaseback-up.');
    }
    // A successful claim whose HTTP response was lost must not be silently
    // reassigned to another bot; its send outcome cannot be proven remotely.
    for (const item of await state.call('outstanding', {})) {
        await state.call('ack', {token:item.token,state:'uncertain',detail:'Reservering zonder lokaal resultaat; controleer het kanaal.'});
        logger.warn(`[Botbericht] ${item.messageId} / server ${item.guildId}: onzekere verzending, niet automatisch herhaald.`);
    }
}
async function deliver(state, item) {
    state.store.beginReceipt(item);
    let status='failed', discordId=null, detail='';
    let sending=false;
    try {
        await config.__context.run(item.guildId, async()=>{
            const guild=state.client.guilds.cache.get(item.guildId);
            if(!guild) { status='skipped'; detail='Bot is geen lid meer van deze server.'; return; }
            const channelId=config.Logging?.Channel;
            if(!channelId) { status='skipped'; detail='Geen botlogkanaal ingesteld.'; return; }
            const channel=await guild.channels.fetch(channelId);
            if(!channel || channel.guild?.id!==guild.id || !channel.isTextBased?.() || typeof channel.send!=='function') {
                throw new Error('Botlogkanaal ontbreekt of is geen tekstkanaal van deze server.');
            }
            sending=true;
            const message=await channel.send({content:item.body,allowedMentions:{parse:[]}});
            discordId=message.id; status='sent';
        });
    } catch(error) {
        // Definitive Discord 4xx rejection versus an ambiguous network timeout.
        const rejected=Number(error.status)>=400 && Number(error.status)<500;
        status=sending && !rejected ? 'uncertain' : 'failed';
        detail=String(error.message || error).slice(0,300);
    }
    state.store.finishReceipt(item.token,status,discordId,detail);
    const guild=state.client.guilds.cache.get(item.guildId);
    logger.info(`[Botbericht] ${guild?.name || 'Onbekende server'} (${item.guildId}) | ${item.messageId}: ${status}${detail ? ' — '+detail : ''}`);
    // Persist first, acknowledge second. If the hub is offline, the receipt is
    // retried later without creating a second Discord message.
    const receipt={token:item.token,state:status,discordId,detail};
    const result=await state.call('ack',receipt);
    if(result.ok) state.store.removeReceipt(item.token);
    else throw new Error('Centraal meldpunt weigerde de ontvangstbevestiging.');
}
async function tick(state) {
    if(state.stopping || state.work) return state.work;
    state.work=(async()=>{
        await state.call('register',{guildIds:guildIds(state.client)});
        await flushReceipts(state);
        for(let i=0;i<20 && !state.stopping;i++) {
            const item=await state.call('claim',{guildIds:guildIds(state.client)});
            if(!item) break;
            await deliver(state,item);
        }
        if(state.lastError) logger.info('[Botbericht] Verbinding met centraal meldpunt hersteld.');
        state.lastError=0;
    })().catch(error=>{
        if(!state.lastError || Date.now()-state.lastError>300000) {
            logger.warn(`[Botbericht] Synchronisatie wacht: ${error.message}`);
            state.lastError=Date.now();
        }
    }).finally(()=>{state.work=null;});
    return state.work;
}
async function start(client) {
    if(active) return;
    startupError=null;
    let state;
    try {
        const options=settings();
        if(!options.enabled) return;
        const botId=client.user.id;
        if(!options.botIds.includes(botId)) throw new Error('Eigen bot-ID ontbreekt in BROADCAST_BOT_IDS.');
        const central=botId===options.centralBotId;
        if(!central) {
            const url=new URL(options.url);
            if(!['http:','https:'].includes(url.protocol) || url.username || url.password || url.pathname!=='/' || url.search || url.hash) {
                throw new Error('BROADCAST_URL moet http(s)://adres:poort zijn, zonder pad of wachtwoord.');
            }
        }
        const store=require('../database/broadcastStore').createStore(require('../database/database').db);
        state={client,options,store,central,work:null,stopping:false,lastError:0};
        const handler=handlerFor(store);
        state.call=central ? (action,data)=>handler(botId,action,data) : (action,data)=>transport.request(options,botId,action,data);
        if(central) {
            state.server=transport.createServer(options,handler,store.acceptNonce);
            await new Promise((resolve,reject)=>{
                state.server.once('error',reject);
                state.server.listen(options.port,options.host,()=>{state.server.removeListener('error',reject);resolve();});
            });
            state.server.on('error',error=>logger.error(`[Botbericht] Centraal meldpunt: ${error.message}`));
        }
        active=state;
        state.timer=setInterval(()=>void tick(state),options.pollSeconds*1000);
        state.timer.unref();
        logger.info(`[Botbericht] ${central ? 'Centraal meldpunt' : 'Ontvanger'} gestart voor bot ${botId}.`);
        void tick(state);
    } catch(error) {
        state?.server?.close();
        startupError=error.message;
        logger.error(`[Botbericht] Koppeling niet gestart: ${error.message}`);
    }
}
async function publish(client,userId,message,requestId) {
    if(!isBotOwner(userId)) throw new Error('Alleen de vaste boteigenaar kan een botbericht versturen.');
    if(typeof message!=='string' || !message.trim() || message.length>2000) throw new Error('Het bericht moet 1 tot 2000 tekens bevatten.');
    if(!active) throw new Error(startupError || 'De centrale koppeling is nog niet gestart.');
    if(!active.central || client.user.id!==active.options.centralBotId) {
        throw new Error(`Gebruik /botbericht bij de centrale bot (${active.options.centralBotId}). Deze installatie ontvangt alleen.`);
    }
    if(typeof requestId!=='string' || !/^\d{17,20}$/.test(requestId)) throw new Error('Ongeldige Discord-interactie.');
    active.store.register(client.user.id,guildIds(client));
    const nodes=active.store.nodes();
    const missing=active.options.botIds.filter(id=>!nodes.some(node=>node.botId===id));
    if(missing.length) throw new Error(`Nog niet alle bots zijn verbonden. Start/configureer eerst: ${missing.join(', ')}. Er is niets verstuurd.`);
    const result=active.store.publish(requestId,message,active.options.botIds);
    void tick(active);
    return {...result,queued:true};
}
async function stop() {
    if(!active) return;
    const state=active;
    state.stopping=true;
    clearInterval(state.timer);
    await state.work;
    if(state.server) await new Promise(resolve=>{
        state.server.close(resolve);
        state.server.closeAllConnections();
    });
    active=null;
}
module.exports={start,stop,publish,handlerFor,deliver,flushReceipts};
