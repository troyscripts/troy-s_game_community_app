'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const mock = (name, exports) => { require.cache[require.resolve(name)] = {exports}; };
const markers = new Map();
const config = {Birthday:{Enabled:true,Role:'birthday',Channel:'channel',CheckTime:'00:00',Timezone:'Europe/Amsterdam'},__context:{run:(_id,fn)=>fn()}};
mock('../config/config',config);
mock('../utils/logger',{warn(){},error(message){throw new Error(message);}});
mock('../utils/localization',{tr:s=>s,send:async(channel,method,payload)=>channel[method](payload)});
mock('../database/birthday',{getBirthdaysForDay:()=>[{user_id:'celebrant'}]});
mock('../database/taskState',{getLastRun:key=>markers.get(key),setLastRun:(key,_guild,value)=>markers.set(key,value)});
const scheduler = require('../services/birthdayScheduler');
test('failed full fetch still awards birthday role, cleans cached stale roles, retries full scan without duplicate message',async()=>{
    let scans=0, individual=0, adds=0, removes=0, messages=0;
    const roles=new Set();
    const celebrant={id:'celebrant',roles:{cache:roles,add:async id=>{adds++;roles.add(id);}}};
    const staleRoles=new Set(['birthday']);
    const stale={id:'old',roles:{cache:staleRoles,remove:async id=>{removes++;staleRoles.delete(id);}}};
    const guild={id:'guild',roles:{fetch:async()=>({id:'birthday'})},channels:{fetch:async()=>({isTextBased:()=>true,send:async()=>{messages++;}})},members:{cache:new Map([['old',stale]]),fetch:async options=>{
        if(!options){scans++;if(scans===1)throw new Error("Members didn't arrive in time.");return new Map([['old',stale],['celebrant',celebrant]]);}
        individual++;assert.deepEqual(options,{user:'celebrant',force:true});return celebrant;
    }}};
    const client={guilds:{cache:new Map([['guild',guild]])}};
    try {
        await scheduler.runBirthdayCheck(client);
        assert.equal(adds,1);assert.equal(removes,1);assert.equal(messages,1);assert.equal(individual,1);
        await scheduler.runBirthdayCheck(client);
        assert.equal(scans,2);assert.equal(adds,1);assert.equal(messages,1);
    } finally {scheduler.stopBirthdayScheduler();}
});
