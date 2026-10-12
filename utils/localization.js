'use strict';
const translations = require('../locales/en.json');
// Self-contained markers survive stored job notes and never require an in-memory token cache.
// Only explicitly marked bot-owned text is localized. User input is not machine-translated here.
const START = '\uE000', SEP = '\uE001', END = '\uE002';
function pair(nl, en) { return nl === en ? String(nl) : START + nl + SEP + en + END; }
function tr(template, ...args) {
    const fill = text => text.replace(/\{(\d+)\}/g, (match, index) => index < args.length ? String(args[index]) : match);
    return pair(fill(template), fill(translations[template] || template));
}
function render(value, language = 'nl') {
    const text = String(value ?? '');
    let pos = 0;
    function read(stop) {
        let result = '';
        while (pos < text.length) {
            const char = text[pos];
            if (stop && (char === SEP || char === END)) break;
            pos++;
            if (char === START) {
                const nl = read(true);
                if (text[pos] !== SEP) { result += nl; continue; }
                pos++;
                const en = read(true);
                if (text[pos] === END) pos++;
                result += language === 'en' ? en : nl;
            } else if (char !== SEP && char !== END) result += char;
        }
        return result;
    }
    return read(false);
}
function clip(value, limit) {
    return pair(render(value, 'nl').slice(0, limit), render(value, 'en').slice(0, limit));
}
function visible(value, language, limit = Infinity, inline = false) {
    const nl = render(value, 'nl'), en = render(value, 'en');
    const trim = (s, n) => s.length <= n ? s : s.slice(0, Math.max(0, n - 1)) + '…';
    if (language !== 'both' || nl === en) return trim(language === 'en' ? en : nl, limit);
    const separator = inline ? ' / ' : '\n\n';
    const room = Math.max(0, limit - separator.length);
    let a = Math.min(nl.length, Math.floor(room / 2)), b = Math.min(en.length, room - a);
    a = Math.min(nl.length, room - b);
    return trim(nl, a) + separator + trim(en, b);
}
function plain(value) {
    if (Array.isArray(value)) return value.map(plain);
    if (!value || typeof value !== 'object' || Buffer.isBuffer(value)) return value;
    // Discord builders keep their transport data here. Avoid pre-render toJSON validation.
    let source = value.data && typeof value.toJSON === 'function' ? value.data : value;
    if (source !== value && Array.isArray(value.components)) source = {...source, components:value.components};
    if (Object.getPrototypeOf(source) !== Object.prototype && Object.getPrototypeOf(source) !== null) return value;
    return Object.fromEntries(Object.entries(source).map(([key, item]) => [key, plain(item)]));
}
function textTree(value, language) {
    if (typeof value === 'string') return render(value, language);
    if (Array.isArray(value)) return value.map(v => textTree(v, language));
    if (!value || typeof value !== 'object' || Buffer.isBuffer(value)) return value;
    return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,textTree(v,language)]));
}
function payload(input, language) {
    const data = typeof input === 'string' ? { content: input } : plain(input);
    if (!data || typeof data !== 'object') return data;
    const result = { ...data };
    const overflow=[];
    const fit=(value,limit,inline=false)=>{const full=visible(value,language,Infinity,inline);const shortened=visible(value,language,limit,inline);if(full!==shortened)overflow.push(full);return shortened;};
    if (typeof result.content === 'string') result.content = fit(result.content, 2000);
    if (result.embeds) {
        // 6000 characters across all embeds. Reserve room for each text field so both
        // languages remain present even when a user supplies a maximum-length description.
        let budget = 6000;
        const embeds = result.embeds.slice(0,10).map(e => ({...e, fields: e.fields?.map(f=>({...f})), footer:e.footer?{...e.footer}:undefined, author:e.author?{...e.author}:undefined }));
        const leaves=[];
        for (const e of embeds) {
            if(e.title)leaves.push([e,'title',256,false]);
            if(e.description)leaves.push([e,'description',4096,false]);
            if(e.author?.name)leaves.push([e.author,'name',256,true]);
            if(e.footer?.text)leaves.push([e.footer,'text',2048,true]);
            for(const f of e.fields||[]) {leaves.push([f,'name',256,false],[f,'value',1024,false]);}
        }
        // Allocate small labels first, then share the remainder between larger values.
        leaves.sort((a,b)=>Math.min(a[2],render(a[0][a[1]]).length*2)-Math.min(b[2],render(b[0][b[1]]).length*2));
        leaves.forEach(([obj,key,limit,inline],i)=>{const cap=Math.min(limit,Math.floor(budget/(leaves.length-i)));obj[key]=fit(obj[key],cap,inline)||'\u200b';budget-=obj[key].length;});
        result.embeds=embeds;
    }
    function components(items) {
        return items.map(item => {
            const out={...item};
            for(const [key,limit]of [['label',item.type===4?45:80],['placeholder',150],['description',100]])
                if(typeof out[key]==='string')out[key]=visible(out[key],language,limit,true);
            if(out.components)out.components=components(out.components);
            if(out.options)out.options=out.options.map(o=>({...o,label:visible(o.label,language,100,true),...(o.description?{description:visible(o.description,language,100,true)}:{})}));
            // Text input values are user's editable content, never an implementation marker.
            if(out.type===4&&typeof out.value==='string')out.value=render(out.value,language==='both'?'nl':language);
            return out;
        });
    }
    if(result.components)result.components=components(result.components);
    if(result.title)result.title=visible(result.title,language,45,true); // modal
    if(overflow.length && (result.files?.length||0)<10)result.files=[...(result.files||[]),{attachment:Buffer.from(overflow.join('\n\n---\n\n'),'utf8'),name:'complete-message.txt'}];
    return result;
}
function getLanguage(guildId, userId) { return require('../database/languages').get(guildId, userId); }
function isEphemeral(flags) { return Boolean((Number(flags?.bitfield ?? flags) || 0) & 64); }
function deliveryLanguage(target, method, input) {
    const interaction = target && typeof target.isRepliable === 'function';
    if(interaction) {
        const privateReply = method === 'showModal' || method === 'respond' ||
            (method === 'editReply' ? target.ephemeral : method === 'update' ? isEphemeral(target.message?.flags) : isEphemeral(input?.flags) || input?.ephemeral);
        return privateReply ? getLanguage(target.guildId,target.user.id) : 'both';
    }
    const channel = target?.channel || target;
    if(channel?.isDMBased?.() || target?.recipient || target?.username || target?.user?.username) {
        const userId = target.recipient?.id || target.channel?.recipient?.id || target.user?.id || target.id;
        // A moderation DM uses the recipient's preference in the current server.
        const guildId = target.guild?.id || require('../config/config').__context.getGuildId();
        return getLanguage(guildId,userId);
    }
    return 'both';
}
function send(target, method, ...args) {
    const language=deliveryLanguage(target,method,args[0]);
    if(method==='respond') args[0]=args[0].map(c=>({...c,name:visible(c.name,language,100,true)}));
    else args[0]=payload(args[0],language);
    return target[method](...args);
}
// Slash command identifiers remain stable; Discord translates descriptions and choice labels.
function translateMetadata(value) {
    if (translations[value]) return translations[value];
    // Builder descriptions such as category 1..10 are instantiated before registration.
    for (const [template, english] of Object.entries(translations)) {
        if (!/\{\d+\}/.test(template)) continue;
        const chunks=template.split(/\{\d+\}/);
        const pattern=new RegExp('^'+chunks.map(c=>c.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('(.*?)')+'$');
        const match=pattern.exec(value);
        if(match)return english.replace(/\{(\d+)\}/g,(_,i)=>match[Number(i)+1]||'');
    }
    return value;
}
function commandData(data) {
    const out={...data};
    if(out.description) {
        const english = out.description_localizations?.['en-US'] || translateMetadata(render(out.description,'nl'));
        out.description=render(out.description,'nl');
        out.description_localizations={...out.description_localizations,'en-US':english,'en-GB':english};
    }
    const names=require('../locales/names-en.json');
    const englishName=names[out.name] || (/^categorie\d+$/.test(out.name)?out.name.replace('categorie','category'):/^minimumrol\d+$/.test(out.name)?out.name.replace('minimumrol','minimum-role'):null);
    if(englishName)out.name_localizations={...out.name_localizations,'en-US':englishName,'en-GB':englishName};
    if(out.options)out.options=out.options.map(commandData);
    if(out.choices)out.choices=out.choices.map(c=>({...c,name_localizations:{...c.name_localizations,'en-US':render(tr(c.name),'en'),'en-GB':render(tr(c.name),'en')}}));
    return out;
}
module.exports={tr,pair,render,clip,visible,plain,textTree,payload,send,getLanguage,commandData};
