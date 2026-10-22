const { Events }=require('discord.js');
module.exports={name:Events.MessageUpdate,async execute(client,before,after){
 if(after.partial) after=await after.fetch().catch(()=>null);
 if(after && before.content!==after.content) require('../services/softModeration').enqueue(after,true);
}};
