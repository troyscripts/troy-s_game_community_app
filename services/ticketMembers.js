'use strict';
const {Collection}=require('discord.js');
const running=new Map();
async function fetchTicketMembers(guild){
    // REST pagination avoids Request Guild Members (gateway opcode 8). The SDK
    // queues REST rate limits. Share concurrent loads, but do not reuse stale
    // role membership across completed actions.
    if(running.has(guild.id))return running.get(guild.id);
    const task=(async()=>{
        const members=new Collection();
        let after;
        do {
            const page=await guild.members.list({limit:1000,after,cache:true});
            for(const [id,member] of page)members.set(id,member);
            if(page.size<1000)break;
            const next=[...page.keys()].reduce((a,b)=>BigInt(a)>BigInt(b)?a:b);
            if(after&&BigInt(next)<=BigInt(after))throw Error('Ledenlijst kon niet volledig worden geladen.');
            after=next;
        }while(true);
        return members;
    })();
    running.set(guild.id,task);
    try{return await task;}finally{if(running.get(guild.id)===task)running.delete(guild.id);}
}
module.exports={fetchTicketMembers};
