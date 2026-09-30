// Run privately on the bot host while the bot is stopped. Never log tokens.
require('dotenv').config({quiet:true});
const { randomBytes } = require('node:crypto');
const readline = require('node:readline/promises');
const providers = require('../services/notify/providers');
async function main() {
    const redirect = process.env.TIKTOK_REDIRECT_URI;
    if (!process.env.TIKTOK_CLIENT_KEY || !process.env.TIKTOK_CLIENT_SECRET || !redirect) throw new Error('Vul TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET en TIKTOK_REDIRECT_URI in .env in.');
    const destination = new URL(redirect);
    if (destination.protocol !== 'https:' || destination.search || destination.hash || destination.username || destination.password) throw new Error('Gebruik een geregistreerde HTTPS-redirect-URL zonder query of fragment.');
    const state = randomBytes(32).toString('hex');
    const url = new URL('https://www.tiktok.com/v2/auth/authorize/');
    url.search = new URLSearchParams({client_key:process.env.TIKTOK_CLIENT_KEY,scope:'user.info.basic,user.info.profile,video.list',response_type:'code',redirect_uri:redirect,state}).toString();
    console.log('Laat de creator deze URL openen en de app toestemming geven:\n'+url.toString());
    const rl = readline.createInterface({input:process.stdin,output:process.stdout});
    let callback;
    try { callback = new URL((await rl.question('Plak daarna de volledige terugkeer-URL uit de adresbalk (bevat een eenmalige code): ')).trim()); }
    finally { rl.close(); }
    if (callback.origin !== destination.origin || callback.pathname !== destination.pathname || callback.searchParams.get('state') !== state) throw new Error('Terugkeer-URL of beveiligingscode komt niet overeen. Begin opnieuw.');
    const code = callback.searchParams.get('code');
    if (!code || callback.searchParams.has('error')) throw new Error('Geen toestemming/code ontvangen. Begin opnieuw.');
    const token = providers.tokenRecord(await providers.tokenRequest({grant_type:'authorization_code',code,redirect_uri:redirect}));
    const profile = await providers.request('https://open.tiktokapis.com/v2/user/info/?fields=open_id,username',{headers:{Authorization:`Bearer ${token.access_token}`}});
    const user = profile.data?.user;
    if (!user?.username || user.open_id !== token.open_id) throw new Error('TikTok-profiel kon niet worden geverifieerd.');
    const name = providers.account('tiktok',user.username);
    providers.saveToken(name,token);
    console.log(`TikTok @${name} is gekoppeld. Start de bot en controleer /notify lijst. Deel het koppelbestand niet.`);
}
main().catch(error => { console.error(error.message); process.exitCode=1; });
