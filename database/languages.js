'use strict';
const { db } = require('./database');
let initialized=false;
function init(){if(initialized)return;db.exec(`CREATE TABLE IF NOT EXISTS member_languages (
 guild_id TEXT NOT NULL, user_id TEXT NOT NULL, language TEXT NOT NULL CHECK(language IN ('nl','en')),
 PRIMARY KEY(guild_id,user_id))`);initialized=true;}
function get(guildId,userId,fallback='nl'){init();return db.prepare('SELECT language FROM member_languages WHERE guild_id = ? AND user_id = ?').get(String(guildId||'dm'),String(userId))?.language||fallback;}
function set(guildId,userId,language){if(!['nl','en'].includes(language))throw new Error('Invalid language');init();db.prepare(`INSERT INTO member_languages(guild_id,user_id,language) VALUES(?,?,?)
 ON CONFLICT(guild_id,user_id) DO UPDATE SET language=excluded.language`).run(String(guildId||'dm'),String(userId),language);}
module.exports={get,set};
