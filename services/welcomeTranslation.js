'use strict';
const { pair } = require('../utils/localization');
const store = require('../database/welcomeTranslations');
const settings = require('../database/guildSettings');
const textTranslation=require('./textTranslation');
const busy=new Set();
function fail(nl,en){throw new Error(pair(nl,en));}
async function translate(guildId,manual=null){
    if(busy.has(guildId))fail('Deze welkomsttekst wordt al vertaald. Probeer het zo opnieuw.','This welcome text is already being translated. Try again shortly.');
    busy.add(guildId);
    try{
        const source=settings.getGuildConfig(guildId).Welcome.Message;
        const english=await textTranslation.translate(source,manual);
        if(settings.getGuildConfig(guildId).Welcome.Message!==source)fail('De welkomsttekst is ondertussen gewijzigd. Voer vertalen opnieuw uit.','The welcome text changed during translation. Run translate again.');
        store.save(guildId,source,english);
        return english;
    }finally{busy.delete(guildId);}
}
module.exports={translate,validate:textTranslation.validate};
