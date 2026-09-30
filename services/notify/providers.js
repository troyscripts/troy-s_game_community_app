const fs = require('node:fs');
const { platformRequest } = require('../../utils/platformRequest');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const tokenPath = path.resolve(__dirname, '../../data/notify-tokens.json');

function account(platform, input) {
    let value = input.trim();
    if (/^https?:\/\//i.test(value)) {
        const url = new URL(value);
        const hosts = platform === 'youtube' ? ['youtube.com','www.youtube.com'] : ['tiktok.com','www.tiktok.com'];
        if (url.protocol !== 'https:' || !hosts.includes(url.hostname) || url.port || url.username || url.password) throw new Error('Gebruik een HTTPS-profiel-URL van het gekozen platform.');
        const parts = url.pathname.split('/').filter(Boolean);
        if (platform === 'youtube' && parts[0] === 'channel' && parts.length === 2) value = parts[1];
        else if (parts.length === 1 && parts[0].startsWith('@')) value = parts[0];
        else throw new Error('Gebruik de creatorprofiel-URL, geen videolink.');
    }
    if (platform === 'youtube') {
        if (/^UC[\w-]{22}$/.test(value)) return value;
        if (/^@[\p{L}\p{N}_.·-]{3,30}$/u.test(value)) return value.toLowerCase();
        throw new Error('Gebruik een YouTube @handle of UC-kanaal-ID.');
    }
    if (platform !== 'tiktok') throw new Error('Platform niet ondersteund.');
    value = value.replace(/^@/,'').toLowerCase();
    if (!/^[a-z0-9_.]{2,24}$/.test(value)) throw new Error('Gebruik een geldige TikTok @gebruikersnaam.');
    return value;
}
async function request(url, options = {}, json = true) {
    const host = new URL(url).hostname;
    const isYoutube = ['www.youtube.com','youtube.com'].includes(host);
    // Anonymous bot consent preference; no account/browser cookies are loaded or stored.
    // SOCS=CAI is also used by yt-dlp's YouTube consent initialization.
    const requestOptions = isYoutube ? {...options,headers:{...options.headers,Cookie:'SOCS=CAI'}} : options;
    const {response,data} = await platformRequest(url, requestOptions, {
        allowedHosts: isYoutube ? ['www.youtube.com','youtube.com'] : [host],
        read: async response => {
            if (!response.ok) { await response.body?.cancel(); return null; }
            if (!json) return response.text();
            try { return await response.json(); }
            catch (error) {
                if (!(error instanceof SyntaxError)) throw error;
                throw Object.assign(new Error(`${host}: ongeldige JSON ontvangen.`), {permanent:true});
            }
        }
    });
    if (!response.ok) throw new Error(`${host}: HTTP ${response.status}; controleer koppeling of probeer later opnieuw.`);
    if (json && (!data || typeof data !== 'object')) throw new Error(`${host}: ongeldig JSON-antwoord ontvangen.`);
    if (json && data.error && data.error?.code !== 'ok') throw new Error('TikTok heeft de aanvraag geweigerd. Controleer toestemming, scopes en koppel zo nodig opnieuw.');
    return data;
}

function decode(value) {
    return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (match,key) => {
        const named = {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
        if (key[0] !== '#') return named[key.toLowerCase()] || match;
        const n = key[1].toLowerCase() === 'x' ? parseInt(key.slice(2),16) : Number(key.slice(1));
        return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
    });
}
function tag(xml,name) { return decode(xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`))?.[1] || '').trim(); }
function parseFeed(xml, expectedId) {
    if (!/<feed[\s>]/.test(xml) || !/<\/feed>/.test(xml) || /<!DOCTYPE/i.test(xml)) throw new Error('YouTube-feed is ongeldig; niets als verwerkt opgeslagen.');
    const header = xml.split('<entry>')[0];
    const feedId = tag(header,'yt:channelId');
    // Live Atom feeds may omit the UC prefix; compare the exact remaining ID.
    if (!/^UC[\w-]{22}$/.test(expectedId) || ![expectedId,expectedId.slice(2)].includes(feedId)) throw new Error('YouTube-feed hoort niet bij het ingestelde kanaal.');
    const blocks = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
    return blocks.map(([,block]) => {
        const id = tag(block,'yt:videoId');
        const published = Date.parse(tag(block,'published'));
        if (!/^[\w-]{11}$/.test(id) || !Number.isFinite(published)) throw new Error('YouTube-video bevat ongeldige gegevens.');
        return {id, title:tag(block,'title') || 'Nieuwe video', published, url:`https://www.youtube.com/watch?v=${id}`, image:`https://i.ytimg.com/vi/${id}/hqdefault.jpg`};
    });
}
async function youtube(row) {
    let id = row.resolved_id || (/^UC[\w-]{22}$/.test(row.account) ? row.account : null);
    if (!id) {
        const html = await request(`https://www.youtube.com/${encodeURI(row.account)}`,{},false);
        // Only channel-specific metadata, never an arbitrary recommended video's channelId.
        id = html.match(/<link[^>]+href=["']https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})["']/)?.[1]
            || html.match(/<meta[^>]+itemprop=["']identifier["'][^>]+content=["'](UC[\w-]{22})["']/)?.[1]
            || html.match(/"channelMetadataRenderer"\s*:\s*\{[^}]*?"externalId"\s*:\s*"(UC[\w-]{22})"/)?.[1];
        if (!id) throw new Error('YouTube-kanaal-ID niet gevonden. Gebruik /notify youtube-id met het UC-kanaal-ID uit YouTube Studio.');
    }
    const xml = await request(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`,{},false);
    return {resolvedId:id,items:parseFeed(xml,id)};
}
function readTokens() {
    try { return JSON.parse(fs.readFileSync(tokenPath,'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return {}; throw new Error('TikTok-koppelbestand is ongeldig; herstel het bestand.'); }
}
function saveToken(username, token) {
    const all = readTokens(); all[username] = token;
    fs.mkdirSync(path.dirname(tokenPath),{recursive:true,mode:0o700});
    const tmp = `${tokenPath}.${randomBytes(6).toString('hex')}.tmp`;
    fs.writeFileSync(tmp,JSON.stringify(all,null,2),{mode:0o600});
    fs.renameSync(tmp,tokenPath);
}
async function tokenRequest(fields) {
    if (!process.env.TIKTOK_CLIENT_KEY || !process.env.TIKTOK_CLIENT_SECRET) throw new Error('TikTok-appgegevens ontbreken in .env; zie NOTIFY-HANDLEIDING.md.');
    return request('https://open.tiktokapis.com/v2/oauth/token/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_key:process.env.TIKTOK_CLIENT_KEY,client_secret:process.env.TIKTOK_CLIENT_SECRET,...fields})});
}
function tokenRecord(data, previous = {}) {
    const scopes = (data.scope || previous.scope || '').split(',');
    if (!data.access_token || !Number.isFinite(Number(data.expires_in)) || Number(data.expires_in) <= 0 || !['video.list','user.info.basic','user.info.profile'].every(s => scopes.includes(s))) throw new Error('TikTok-toestemming mist vereiste scopes. Koppel opnieuw met alle aangevraagde rechten.');
    return {...previous,...data,expires_at:Date.now()+Number(data.expires_in)*1000};
}
async function tiktok(row) {
    let token = readTokens()[row.account];
    if (!token) throw new Error('Wacht op TikTok-accountkoppeling. Zie NOTIFY-HANDLEIDING.md.');
    if (!Number.isFinite(token.expires_at) || token.expires_at < Date.now()+300000) {
        if (!token.refresh_token) throw new Error('TikTok-toestemming verlopen. Koppel het account opnieuw.');
        token = tokenRecord(await tokenRequest({grant_type:'refresh_token',refresh_token:token.refresh_token}),token);
        // Persist rotated refresh tokens before any further network operation.
        saveToken(row.account,token);
    }
    const headers = {Authorization:`Bearer ${token.access_token}`,'Content-Type':'application/json'};
    const profile = await request('https://open.tiktokapis.com/v2/user/info/?fields=open_id,username',{headers});
    if (profile.data?.user?.username?.toLowerCase() !== row.account || profile.data?.user?.open_id !== token.open_id) throw new Error('TikTok-accountnaam gewijzigd of koppeling komt niet overeen. Koppel opnieuw.');
    const items = [];
    let cursor;
    for (let page=0;page<50;page++) {
        const data = await request('https://open.tiktokapis.com/v2/video/list/?fields=id,title,create_time,cover_image_url',{method:'POST',headers,body:JSON.stringify({max_count:20,...(cursor ? {cursor} : {})})});
        if (!Array.isArray(data.data?.videos)) throw new Error('TikTok gaf geen geldige videolijst terug.');
        const batch = data.data.videos.map(v => {
            if (!/^\d+$/.test(v.id) || !Number.isFinite(v.create_time)) throw new Error('TikTok-video bevat ongeldige gegevens.');
            return {id:v.id,title:v.title || 'Nieuwe TikTok-video',published:v.create_time*1000,url:`https://www.tiktok.com/@${row.account}/video/${v.id}`,image:/^https:\/\//.test(v.cover_image_url || '') ? v.cover_image_url : undefined};
        });
        items.push(...batch);
        if (!data.data.has_more || row.baseline_at === null || batch.some(v => v.published < row.baseline_at)) return {items};
        if (!data.data.cursor || data.data.cursor === cursor) throw new Error('TikTok-paginering is ongeldig.');
        cursor = data.data.cursor;
    }
    throw new Error('Te veel TikTok-pagina’s; koppel opnieuw of vraag beheer om hulp.');
}
module.exports = {account,parseFeed,youtube,tiktok,request,readTokens,saveToken,tokenRequest,tokenRecord};
