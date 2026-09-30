'use strict';
const { setTimeout: delay } = require('node:timers/promises');

// Only expose error categories, never URLs, tokens or arbitrary server responses.
function networkReason(error) {
    const codes = new Set();
    const seen = new Set();
    function visit(e) {
        if (!e || seen.has(e)) return;
        seen.add(e);
        if (/^[A-Z][A-Z0-9_]{1,60}$/.test(e.code || '')) codes.add(e.code);
        if (['TimeoutError','AbortError'].includes(e.name)) codes.add('TIMEOUT');
        visit(e.cause);
        for (const child of e.errors || []) visit(child);
    }
    visit(error);
    return [...codes].join(', ') || 'netwerkfout zonder foutcode';
}
async function platformRequest(url, options = {}, {
    fetchImpl = globalThis.fetch, read = response => response.text(), timeoutMs = 20000,
    wait = delay, allowedHosts = [new URL(url).hostname]
} = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const attempts = method === 'GET' ? 2 : 1;
    const host = new URL(url).hostname;
    for (let attempt = 0; attempt < attempts; attempt++) {
        const signal = AbortSignal.timeout(timeoutMs);
        let current = new URL(url);
        try {
            for (let redirects = 0; ; redirects++) {
                if (current.protocol !== 'https:' || current.port || current.username || current.password || !allowedHosts.includes(current.hostname)) {
                    throw Object.assign(new Error(`${host}: doorverwijzing naar ${current.hostname} buiten het toegestane platform geweigerd.`), {permanent:true});
                }
                const response = await fetchImpl(current.href, {...options,redirect:'manual',signal});
                if ([301,302,303,307,308].includes(response.status)) {
                    const location = response.headers?.get('location');
                    await response.body?.cancel();
                    if (method !== 'GET' || !location || redirects >= 3) throw Object.assign(new Error(`${host}: ongeldige of te veel doorverwijzingen.`), {permanent:true});
                    current = new URL(location,current);
                    continue;
                }
                if ([502,503,504].includes(response.status) && attempt + 1 < attempts) {
                    await response.body?.cancel();
                    break;
                }
                // Reading is covered by the same timeout as connecting.
                return {response, data:await read(response)};
            }
        } catch (error) {
            if (error.permanent) throw error;
            if (attempt + 1 >= attempts) throw new Error(`${host}: ${networkReason(error)} (timeout maximaal ${timeoutMs/1000}s per poging).`, {cause:error});
        }
        await wait(750);
    }
}
module.exports = {platformRequest,networkReason};
