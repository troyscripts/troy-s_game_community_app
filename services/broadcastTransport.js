// AES-256-GCM protects both authentication and message contents, also on an
// allocated HTTP port. Keys never travel over the network. HTTPS also works.
const crypto = require('node:crypto');
const http = require('node:http');
function seal(secret, value) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(secret, 'hex'), iv);
    const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    return JSON.stringify({ iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') });
}
function open(secret, text) {
    const value = JSON.parse(text);
    const iv = Buffer.from(value.iv, 'base64');
    const tag = Buffer.from(value.tag, 'base64');
    if (iv.length !== 12 || tag.length !== 16) throw new Error('Invalid envelope');
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(secret, 'hex'), iv);
    decipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.data, 'base64')), decipher.final()]).toString('utf8'));
}
function createServer(settings, handler, acceptNonce) {
    const seen = new Map();
    const server = http.createServer(async (req, res) => {
        const reject = (status) => { res.writeHead(status); res.end('Request rejected'); };
        if (req.method !== 'POST' || req.url !== '/broadcast/v1') return reject(404);
        let packet;
        try {
            const chunks = []; let size = 0;
            for await (const chunk of req) {
                size += chunk.length;
                if (size > 65536) { reject(413); return; }
                chunks.push(chunk);
            }
            packet = open(settings.secret, Buffer.concat(chunks).toString('utf8'));
            const now = Date.now();
            for (const [nonce, expires] of seen) if (expires < now) seen.delete(nonce);
            if (packet.kind !== 'request' || !settings.botIds.includes(packet.botId) ||
                !Number.isFinite(packet.time) || Math.abs(now-packet.time)>60000 ||
                typeof packet.nonce !== 'string' || !/^[a-f0-9]{32}$/.test(packet.nonce) || seen.has(packet.nonce)) return reject(401);
            if (seen.size >= 10000) return reject(429);
            if (acceptNonce && !acceptNonce(packet.nonce, now + 120000)) return reject(401);
            seen.set(packet.nonce, now + 120000);
        } catch { return reject(401); }
        try {
            const data = await handler(packet.botId, packet.action, packet.data);
            res.writeHead(200, {'Content-Type':'application/json','Cache-Control':'no-store'});
            res.end(seal(settings.secret, {kind:'response', nonce:packet.nonce, data}));
        } catch {
            res.writeHead(400, {'Content-Type':'application/json','Cache-Control':'no-store'});
            res.end(seal(settings.secret, {kind:'response', nonce:packet.nonce, error:'Ongeldig synchronisatieverzoek.'}));
        }
    });
    server.requestTimeout = 10000;
    server.headersTimeout = 10000;
    server.maxHeadersCount = 30;
    server.timeout = 15000;
    return server;
}
async function request(settings, botId, action, data) {
    const nonce = crypto.randomBytes(16).toString('hex');
    const response = await fetch(new URL('/broadcast/v1', settings.url), {
        method:'POST', redirect:'error', signal:AbortSignal.timeout(10000),
        headers:{'Content-Type':'application/json'},
        body:seal(settings.secret, {kind:'request',botId,action,data,nonce,time:Date.now()})
    });
    // Cap hostile/misconfigured endpoint output before parsing.
    const chunks=[]; let size=0;
    for await (const chunk of response.body) {
        size += chunk.length;
        if(size > 65536) throw new Error('Te groot antwoord van centraal meldpunt.');
        chunks.push(chunk);
    }
    let packet;
    try { packet = open(settings.secret, Buffer.concat(chunks).toString('utf8')); }
    catch { throw new Error(`Centraal meldpunt onbereikbaar of sleutel onjuist (HTTP ${response.status}).`); }
    if(packet.kind !== 'response' || packet.nonce !== nonce) throw new Error('Ongeldig antwoord van centraal meldpunt.');
    if(!response.ok || packet.error) throw new Error(packet.error || `HTTP ${response.status}`);
    return packet.data;
}
module.exports = {seal, open, createServer, request};
