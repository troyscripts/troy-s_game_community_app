'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'troy-living-'));
const defaults=require('../config/defaults');defaults.Database.File=path.join(tmp,'test.sqlite');defaults.Logging.Enabled=false;defaults.Economy.Enabled=true;
const database=require('../database/database');database.initializeDatabase();
const {db}=database,economy=require('../database/economy'),data=require('../database/living');
const {resetEconomy}=require('../database/economyReset'),{resetProgress}=require('../database/progressReset');
const bonus=require('../services/rewardBonus'),service=require('../services/living');
const g='111111111111111111',other='222222222222222222',u='709486570293559356',v='333333333333333333';
const realNow=Date.now;let now=1800000000000;Date.now=()=>now;
async function run(){
 economy.setMoney(u,g,500000,500000);economy.setMoney(u,other,100,100);
 data.move('starter',g,u,'starter','koop','wallet');assert.equal(economy.getBalance(u,g).wallet,485000);
 data.move('starter',g,u,'starter','koop','wallet');assert.equal(economy.getBalance(u,g).wallet,485000);
 assert.throws(()=>data.move('starter',g,v,'starter','koop','wallet'));
 assert.equal(data.multiplier(g,u),1.5);assert.equal(data.multiplier(other,u),1);
 assert.equal(bonus.applyRewardBonus(5,{id:u,guild:{id:g},roles:{cache:new Map()}}),7);
 require('../config/rewardBonuses').VIPRoles.push('vip');
 const member={id:u,guild:{id:g},roles:{cache:new Map([['vip',{}]])}};
 assert.equal(bonus.applyRewardBonus(100,member),300);
 const moved=data.move('luxe',g,u,'luxe','koop','wallet');assert.equal(moved.refund,2250);assert.equal(economy.getBalance(u,g).wallet,412250);
 assert.equal(bonus.applyRewardBonus(100,member),400);
 data.move('villa',g,u,'villa','koop','wallet');assert.equal(economy.getBalance(u,g).wallet,173500);assert.equal(bonus.applyRewardBonus(100,member),600);
 // Cannot turn a failed move into a sale refund or discard the old home.
 economy.setMoney(u,g,0,0);const old=JSON.stringify(data.home(g,u));
 assert.throws(()=>data.move('poor',g,u,'luxe','koop','wallet'));assert.equal(JSON.stringify(data.home(g,u)),old);assert.equal(economy.getBalance(u,g).wallet,0);
 assert.throws(()=>data.move('bad',g,u,'toString','koop','wallet'));
 economy.setMoney(u,g,100000,100000);
 data.move('rent',g,u,'starter','huur','bank');assert.equal(economy.getBalance(u,g).bank,137000); // 37,500 sale - 500 first day
 assert.equal(data.collectRent(g,u),0);now+=data.DAY;assert.equal(data.collectRent(g,u),500);assert.equal(data.collectRent(g,u),0);
 now+=3*data.DAY;assert.equal(data.collectRent(g,u),1500);assert.equal(data.collectRent(g,u),0);
 data.groceries('food',g,u,'pizza',3,'wallet');data.groceries('food',g,u,'pizza',3,'wallet');assert.equal(data.inventory(g,u)[0].quantity,3);
 assert.throws(()=>data.groceries('badfood',g,u,'pizza',-1,'wallet'));
 assert.throws(()=>data.groceries('nofood',g,u,'pizza',4,'wallet',true));
 const snapshot=()=>JSON.stringify({homes:data.homes(),inventory:data.inventory(g,u),roles:data.roles(g),jobs:data.jobs(),receipts:db.prepare('SELECT * FROM living_receipts').all()});
 const before=snapshot();resetEconomy(g);assert.equal(snapshot(),before);resetProgress(g);assert.equal(snapshot(),before);economy.setMoney(u,g,0,0);assert.equal(snapshot(),before);assert.equal(economy.getBalance(u,other).wallet,100);
 now+=data.DAY;assert.equal(data.collectRent(g,u),500);assert.equal(economy.getBalance(u,g).bank,-500);resetEconomy(g);assert.equal(economy.getBalance(u,g).bank,-500);
 data.groceries('eat',g,u,'pizza',2,'wallet',true);assert.equal(data.inventory(g,u)[0].quantity,1);
 data.leave('cancel',g,u);assert.equal(data.multiplier(g,u),1);now+=data.DAY;assert.equal(data.collectRent(g,u),0);assert.equal(data.home(g,u),undefined);
 // Role creation, exact colors, cleanup and failed-delivery retry.
 const {PermissionsBitField}=require('discord.js');const roleCache=new Map(),memberCache=new Map();let created=0,failAdd=false;
 const m={roles:{cache:memberCache,async add(id){if(failAdd)throw Error('temporary role error');memberCache.set(id,roleCache.get(id));},async remove(id){memberCache.delete(id);}}};
 const guild={id:g,members:{fetchMe:async()=>({permissions:{has:()=>true}}),fetch:async()=>m},roles:{
   fetch:async id=>roleCache.get(id)||null,
   create:async options=>{const role={id:`role-${++created}`,color:options.color,name:options.name,permissions:new PermissionsBitField(options.permissions),editable:true,managed:false,async setColor(color){this.color=color;}};roleCache.set(role.id,role);return role;}
 }};
 const roles=await service.ensureRoles(guild);assert.equal(created,3);assert.equal(roles.starter.color,0xCD7F32);assert.equal(roles.luxe.color,0xC0C0C0);assert.equal(roles.villa.color,0xFFD700);
 await service.ensureRoles(guild);assert.equal(created,3);
 economy.setMoney(u,g,500000,500000);data.move('roles1',g,u,'starter','koop','wallet');await service.syncMember(guild,u,roles);assert.deepEqual([...memberCache.keys()],[roles.starter.id]);
 data.move('roles2',g,u,'luxe','koop','wallet');failAdd=true;await assert.rejects(service.syncMember(guild,u,roles));assert.equal(data.jobs().length,1);const paid=economy.getBalance(u,g).wallet;
 failAdd=false;await service.tick({guilds:{cache:new Map([[g,guild]])}});assert.deepEqual([...memberCache.keys()],[roles.luxe.id]);assert.equal(data.jobs().length,0);assert.equal(economy.getBalance(u,g).wallet,paid);
 roleCache.delete(roles.luxe.id);const repaired=await service.ensureRoles(guild);assert.notEqual(repaired.luxe.id,roles.luxe.id);assert.equal(created,4);
 // Exercise command acknowledgement, confirmation, English output and payload validity.
 const settings=require('../database/guildSettings');settings.initialize();settings.ensureGuild(guild);
 function ui(strings={},confirm=false){return {id:'ui-'+Math.random(),guild,guildId:g,user:{id:u},options:{getString:k=>strings[k]||null,getBoolean:()=>confirm,getInteger:()=>1},async deferReply(p){assert.equal(p.flags,64);this.deferred=true;this.ephemeral=true;},async editReply(p){this.response=p;}};}
 const no=ui({actie:'kopen',woning:'villa'});await service.realtor(null,no);assert.equal(data.home(g,u).home,'luxe');
 const expired=ui({actie:'kopen',woning:'villa'},true);expired.deferReply=async()=>{throw Error('expired');};await assert.rejects(service.realtor(null,expired));assert.equal(data.home(g,u).home,'luxe');
 require('../database/languages').set(g,u,'en');const offer=ui();await service.realtor(null,offer);assert.match(offer.response.content,/Estate agent/);assert.match(offer.response.content,/Bronze/);assert.ok(!/[\uE000-\uE002]/.test(offer.response.content));
 const food=ui({actie:'kopen',product:'water'},true);await service.supermarket(null,food);assert.match(food.response.content,/Purchased/);
 for(const name of ['makelaar','supermarkt']) { const command=require('../commands/economy/'+name);const json=require('../utils/localization').commandData(command.data.toJSON());assert.equal(json.name,name);assert.ok(json.options.length<=25); }
 // Data is on disk and survives reopening, independent of module caches.
 const persisted=data.home(g,u);db.pragma('wal_checkpoint(FULL)');const connection=new (require('better-sqlite3'))(defaults.Database.File);assert.deepEqual(connection.prepare('SELECT * FROM living_homes WHERE guild_id=? AND user_id=?').get(g,u),persisted);connection.close();
 console.log('PASS: housing prices/refunds, atomic rollback, VIP stacking, rounding, rent catch-up/debt/idempotency, all reset paths, inventory, isolation, role colors/switch/retry/recreate, command confirmation/defer/localization, on-disk persistence.');
}
run().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{Date.now=realNow;database.closeDatabase();fs.rmSync(tmp,{recursive:true,force:true});});
