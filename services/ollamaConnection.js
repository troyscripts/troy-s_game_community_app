'use strict';
function connection() {
    const url = new URL(process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434');
    const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
    const token = process.env.OLLAMA_BRIDGE_TOKEN?.trim() || '';
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
        (!local && (url.protocol !== 'https:' || token.length < 32)) ||
        !['http:', 'https:'].includes(url.protocol)) {
        throw Object.assign(new Error('Invalid AI connection configuration'), { code: 'AI_CONFIG' });
    }
    return { url, remote: !local, headers: {
        'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {})
    } };
}
async function requestChat(body) {
    const { url, remote, headers } = connection();
    if (remote) {
        try {
            const health = await fetch(new URL('/health', url), {
                headers, redirect: 'error', signal: AbortSignal.timeout(5000)
            });
            if ([401, 403].includes(health.status)) throw Object.assign(new Error('Authentication failed'), { code: 'AI_AUTH' });
            if (!health.ok || (await health.json()).ok !== true) throw new Error('Offline');
        } catch (error) {
            if (error.code === 'AI_AUTH') throw error;
            throw Object.assign(new Error('AI offline'), { code: 'AI_OFFLINE' });
        }
    }
    try {
        const response = await fetch(new URL('/api/chat', url), {
            method: 'POST', headers, redirect: 'error', signal: AbortSignal.timeout(120000),
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            const error = Object.assign(new Error('AI HTTP error'), { status: response.status });
            if (remote && [401,403].includes(response.status)) error.code = 'AI_AUTH';
            if (remote && [502,503,504,530].includes(response.status)) error.code = 'AI_OFFLINE';
            throw error;
        }
        return await response.json();
    } catch (error) {
        if (remote && error.name === 'TypeError') error.code = 'AI_OFFLINE';
        throw error;
    }
}
module.exports = { requestChat, connection };
