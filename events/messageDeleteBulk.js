module.exports={name:'messageDeleteBulk',async execute(client,messages){for(const message of messages.values())require('../services/ticketEvidence').observe(message,true);}};
