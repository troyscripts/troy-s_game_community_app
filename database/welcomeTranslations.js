'use strict';
const { db } = require('./database');
let initialized=false;
function init(){if(initialized)return;db.exec(`CREATE TABLE IF NOT EXISTS welcome_translations (
 guild_id TEXT PRIMARY KEY, source TEXT NOT NULL, english TEXT NOT NULL)`);initialized=true;}
function get(guildId,source){init();return db.prepare('SELECT english FROM welcome_translations WHERE guild_id=? AND source=?').get(String(guildId),source)?.english||null;}
function save(guildId,source,english){init();db.prepare(`INSERT INTO welcome_translations(guild_id,source,english) VALUES(?,?,?)
 ON CONFLICT(guild_id) DO UPDATE SET source=excluded.source,english=excluded.english`).run(String(guildId),source,english);}
module.exports={get,save};
