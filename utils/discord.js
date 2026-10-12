'use strict';
const discord = require('discord.js');
const { plain, textTree, payload } = require('./localization');
// Builders validate the Dutch text while it is assembled; retain both languages
// until the destination (public/private) is known. No Discord prototypes are modified.
const mappings={setTitle:'title',setDescription:'description',setLabel:'label',setPlaceholder:'placeholder',setFooter:'footer',setAuthor:'author',setValue:'value'};
const exported={...discord};
for(const name of ['EmbedBuilder','ButtonBuilder','StringSelectMenuBuilder','RoleSelectMenuBuilder','ChannelSelectMenuBuilder','TextInputBuilder','ModalBuilder']) {
    const Base=discord[name]; if(!Base)continue;
    class LocalizedBuilder extends Base {
        toJSON() { return payload(name==='EmbedBuilder'?{embeds:[this]}:{components:[this]},'both')[name==='EmbedBuilder'?'embeds':'components'][0]; }
    }
    for(const [method,key]of Object.entries(mappings)) {
        if(typeof Base.prototype[method]!=='function')continue;
        LocalizedBuilder.prototype[method]=function(value,...rest){Base.prototype[method].call(this,textTree(plain(value),'nl'),...rest);this.data[key]=value;return this;};
    }
    for(const [method,key,append]of [['addFields','fields',true],['setFields','fields',false],['addOptions','options',true],['setOptions','options',false]]) {
        if(typeof Base.prototype[method]!=='function')continue;
        LocalizedBuilder.prototype[method]=function(...values){const raw=values.flat();const before=append?[...(this.data[key]||[])]:[];Base.prototype[method].call(this,...textTree(plain(raw),'nl'));this.data[key]=[...before,...raw];return this;};
    }
    exported[name]=LocalizedBuilder;
}
module.exports=exported;
