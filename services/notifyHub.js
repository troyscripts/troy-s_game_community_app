const { createHash } = require('node:crypto');
const providers = require('./notify/providers');
const { createStore } = require('../database/notifyHub');
const snowflake = value => typeof value==='string' && /^\d{17,20}$/.test(value);
const enabled = () => process.env.BROADCAST_ENABLED==='true' && process.env.NOTIFY_HUB_ENABLED!=='false';
const keyFor = (guild,channel,platform,item) => createHash('sha256').update(JSON.stringify([guild,channel,platform,item])).digest('hex');
function createHub(db, provider=providers, clock=Date.now) {
    const store=createStore(db), jobs=new Map();
    store.recover();
    let closed=false;
    function normalize(data) {
        if (!data || !['youtube','twitch','tiktok'].includes(data.platform) || typeof data.account!=='string' || data.account.length>200) throw Error('Ongeldige creator.');
        return provider.account(data.platform,data.account);
    }
    function refresh(source) {
        if (closed || jobs.has(source.id) || (source.attempted_at && clock()-source.attempted_at<60000) || (source.checked_at && clock()-source.checked_at<300000)) return;
        if (jobs.size>=8) return;
        const work=Promise.resolve().then(()=>provider[source.platform]({account:source.account,resolved_id:source.resolved_id,baseline_at:source.checked_at ?? null}))
            .then(result=>{
                if (!Array.isArray(result.items) || result.items.length>5000) throw Error('Ongeldige creatorlijst van platform.');
                const items=result.items.map(item=>{
                    if(typeof item.id!=='string'||item.id.length>100||!Number.isFinite(item.published)||!/^https:\/\//.test(item.url)) throw Error('Ongeldige melding van platform.');
                    return {...item,title:String(item.title||'').slice(0,1000),url:item.url.slice(0,2000),image:item.image?.slice(0,2000),game:item.game?.slice(0,200)};
                });
                store.save(source,{...result,items},clock());
            }).catch(error=>store.fail(source.id,error.message,clock())).finally(()=>jobs.delete(source.id));
        jobs.set(source.id,work);
    }
    async function handle(bot,action,data) {
        if (!['notify-register','notify-feed','notify-claim','notify-ack','notify-history'].includes(action)) throw Error('Onbekende notify-actie.');
        const account=normalize(data);
        const source=store.register(data.platform,account);
        if(action==='notify-register') {
            refresh(source);
            return {id:source.id,account:source.account,resolvedId:source.resolved_id,reused:source.reused,aliases:store.aliases(source.id)};
        }
        if(action==='notify-feed') {
            const offset=data.offset??0, since=data.since??0;
            if (!Number.isSafeInteger(offset)||offset<0||offset>100000||!Number.isSafeInteger(since)||since<0||since>clock()+60000) throw Error('Ongeldige paginering.');
            if(!offset) refresh(source);
            if(source.error || !source.checked_at || clock()-source.checked_at>=300000) {
                return {pending:true,waiting:!source.error,error:source.error||'De hub controleert deze creator; de bot probeert het opnieuw.'};
            }
            if(offset && (data.revision!==source.revision || data.sourceId!==source.id)) return {pending:true,waiting:true,error:'De creator is vernieuwd; de bot haalt de lijst opnieuw op.'};
            const batch=store.items(source.id,offset,since), items=batch.slice(0,10);
            while(Buffer.byteLength(JSON.stringify(items),'utf8')>35000 && items.length>1) items.pop();
            return {id:source.id,account:source.account,resolvedId:source.resolved_id,revision:source.revision,items,next:batch.length>items.length?offset+items.length:null};
        }
        if(action==='notify-history') {
            if(!snowflake(data.guildId)||!snowflake(data.channelId)||!Array.isArray(data.items)||data.items.length>100||data.items.some(id=>typeof id!=='string'||!(/^[\w-]{1,100}$/).test(id))) throw Error('Ongeldige notify-historie.');
            for(const item of data.items) store.history(keyFor(data.guildId,data.channelId,data.platform,item),bot);
            return {ok:true};
        }
        if (!snowflake(data.guildId)||!snowflake(data.channelId)||typeof data.itemId!=='string'||data.itemId.length>100||!/^[a-f0-9-]{36}$/.test(data.token||'')) throw Error('Ongeldige notify-aflevering.');
        const key=keyFor(data.guildId,data.channelId,data.platform,data.itemId);
        if(action==='notify-claim') {
            if(data.platform==='twitch') {
                if(source.error||!source.checked_at||clock()-source.checked_at>=300000) return {state:'wait'};
                if(!store.hasItem(source.id,data.itemId)) return {state:'inactive'};
            } else if (!(data.platform==='youtube' ? /^[\w-]{11}$/.test(data.itemId) : /^\d{1,30}$/.test(data.itemId))) throw Error('Ongeldig video-ID.');
            return store.claim(key,bot,data.token);
        }
        if(action==='notify-ack') {
            if(!['sent','failed','uncertain'].includes(data.state) || (data.discordId && !snowflake(data.discordId))) throw Error('Ongeldige ontvangstbevestiging.');
            return {ok:store.ack(key,bot,data.token,data.state,data.discordId)};
        }
        throw Error('Onbekende notify-actie.');
    }
    return {handle,store,async stop(){closed=true;await Promise.allSettled([...jobs.values()]);},async settle(){await Promise.allSettled([...jobs.values()]);}};
}
function localStore() {return createStore(require('../database/database').db);}
async function call(action,data) {
    return require('./broadcastNetwork').notifyCall(action,data);
}
async function register(platform,account) {
    return call('notify-register',{platform,account});
}
const sourceAccount = row => row.hub_account || (row.platform==='youtube' && row.resolved_id ? row.resolved_id : row.account);
async function feed(row) {
    const history=require('../database/notify').recentSent(row.id);
    if(history.length) await call('notify-history',{platform:row.platform,account:sourceAccount(row),guildId:row.guild_id,channelId:row.channel_id,items:history});
    const items=[];let offset=0,revision,sourceId;
    do {
        const result=await call('notify-feed',{platform:row.platform,account:sourceAccount(row),offset,revision,sourceId,since:row.platform==='twitch'?0:row.baseline_at??0});
        if(result.pending) throw Object.assign(Error(result.error),{notifyHubPending:result.waiting===true});
        if(!Array.isArray(result.items)) throw Error('Ongeldig antwoord van de notify-hub. Werk eerst de hoofd-hub bij.');
        items.push(...result.items);revision=result.revision;sourceId=result.id;offset=result.next;
        if(offset===null) return {...result,items};
    } while(offset<=100000);
    throw Error('Te veel meldingen op de hub; controleer de creator.');
}
async function deliver(row,item,sendMessage,request=call,store=localStore()) {
    const key=keyFor(row.guild_id,row.channel_id,row.platform,item.id);
    let receipt=store.receipt(key);
    const data={platform:row.platform,account:sourceAccount(row),guildId:row.guild_id,channelId:row.channel_id,itemId:item.id};
    async function ack(r) {
        const result=await request('notify-ack',{...data,token:r.token,state:r.state,discordId:r.discord_id});
        if(!result.ok && r.state!=='failed') throw Error('Notify-hub weigerde de ontvangstbevestiging; controleer de hubdatabase.');
    }
    if(receipt) {
        if(receipt.state==='sending') {store.setReceipt(key,receipt.token,'uncertain');receipt=store.receipt(key);}
        await ack(receipt);
        if(receipt.state==='sent') return {sent:true};
        if(receipt.state==='uncertain') throw Object.assign(Error('Onzekere notify-verzending; controleer het doelkanaal. Geen automatische herhaling om dubbele links te voorkomen.'),{notifyDeliveryBlocked:true});
    }
    const token=store.newToken();
    const claim=await request('notify-claim',{...data,token});
    if(claim.state==='sent') return {sent:true};
    if(claim.state==='inactive') return {sent:false};
    if(claim.state!=='claimed') throw Object.assign(Error('Deze melding is gereserveerd of wacht op controle door de hub; geen dubbele verzending.'),claim.outcome==='uncertain'?{notifyDeliveryBlocked:true}:{notifyHubPending:true});
    store.setReceipt(key,token,'sending');
    let message;
    try {message=await sendMessage();}
    catch(error) {
        const rejected=Number(error.status)>=400&&Number(error.status)<500;
        store.setReceipt(key,token,rejected?'failed':'uncertain');
        await ack(store.receipt(key));
        if(!rejected) error.notifyDeliveryBlocked=true;
        throw error;
    }
    store.setReceipt(key,token,'sent',message.id);
    await ack(store.receipt(key));
    return {sent:true};
}
module.exports={enabled,createHub,register,feed,deliver,keyFor};
