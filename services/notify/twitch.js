'use strict';
// App token is shared by all creators and kept only in memory.
let cached = null;
let acquiring = null;
const request = (...args) => require('./providers').request(...args);
async function token() {
    const clientId = process.env.TWITCH_CLIENT_ID?.trim();
    const secret = process.env.TWITCH_CLIENT_SECRET?.trim();
    if (!clientId || !secret) throw new Error('Twitch-appgegevens ontbreken: vul TWITCH_CLIENT_ID en TWITCH_CLIENT_SECRET in .env in. Zie TWITCH-HANDLEIDING.md.');
    if (cached?.clientId === clientId && cached.secret === secret && cached.expires > Date.now()+60000) {
        if (cached.validated > Date.now()-3600000) return cached;
        try {
            const result = await request('https://id.twitch.tv/oauth2/validate',{headers:{Authorization:`OAuth ${cached.access}`}});
            if (result.client_id !== clientId) throw new Error('Twitch-token hoort bij een andere app.');
            cached.validated = Date.now();
            return cached;
        } catch (error) {
            if (error.status !== 401) throw error;
            cached = null;
        }
    }
    if (!acquiring) acquiring = (async () => {
        const result = await request('https://id.twitch.tv/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:secret,grant_type:'client_credentials'})});
        if (typeof result.access_token !== 'string' || !result.access_token || !(Number(result.expires_in)>60)) throw new Error('Twitch gaf geen geldig app-token terug.');
        cached = {clientId,secret,access:result.access_token,expires:Date.now()+Number(result.expires_in)*1000,validated:Date.now()};
        return cached;
    })().finally(() => { acquiring = null; });
    return acquiring;
}
async function api(endpoint) {
    for (let attempt=0;attempt<2;attempt++) {
        const auth = await token();
        try { return await request(`https://api.twitch.tv/helix/${endpoint}`,{headers:{'Client-Id':auth.clientId,Authorization:`Bearer ${auth.access}`}}); }
        catch (error) { if (error.status !== 401 || attempt) throw error; cached = null; }
    }
}
async function twitch(row) {
    const login = require('./providers').account('twitch',row.account);
    let id = row.resolved_id;
    if (!id) {
        const profile = await api(`users?login=${encodeURIComponent(login)}`);
        if (!Array.isArray(profile.data) || profile.data.length !== 1 || profile.data[0].login?.toLowerCase() !== login || !/^\d+$/.test(profile.data[0].id)) throw new Error('Twitch-kanaal niet gevonden. Controleer de gebruikersnaam.');
        id = profile.data[0].id;
    }
    if (!/^\d+$/.test(id)) throw new Error('Ongeldig Twitch-kanaal-ID. Verwijder de creator en voeg hem opnieuw toe.');
    const result = await api(`streams?user_id=${id}&type=live&first=1`);
    if (!Array.isArray(result.data) || result.data.length > 1) throw new Error('Twitch gaf geen geldige streamlijst terug.');
    return {resolvedId:id,items:result.data.map(stream => {
        const published = Date.parse(stream.started_at);
        if (stream.user_id !== id || !/^\d+$/.test(stream.id) || !Number.isFinite(published) || stream.type !== 'live' || !/^[a-z0-9_]{1,25}$/i.test(stream.user_login || '')) throw new Error('Twitch-livestream bevat ongeldige gegevens.');
        return {id:stream.id,title:typeof stream.title === 'string' && stream.title || 'Livestream op Twitch',published,
            url:`https://www.twitch.tv/${stream.user_login.toLowerCase()}`,game:typeof stream.game_name === 'string' ? stream.game_name : '',
            image:/^https:\/\//.test(stream.thumbnail_url || '') ? stream.thumbnail_url.replace('{width}','1280').replace('{height}','720') : undefined};
    })};
}
module.exports = {twitch};
