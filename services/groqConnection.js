'use strict';

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-oss-20b';
let blockedUntil = 0;

function getModel() {
    return process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL;
}
function retrySeconds(value) {
    if (!value) return 60;
    const number = Number(value);
    const seconds = Number.isFinite(number) ? number : (Date.parse(value) - Date.now()) / 1000;
    return Number.isFinite(seconds) ? Math.max(60, Math.min(86400, Math.ceil(seconds))) : 60;
}
async function requestChat({ model = getModel(), messages }) {
    const key = process.env.GROQ_API_KEY?.trim();
    if (!key || key === 'VUL_HIER_JE_GROQ_SLEUTEL_IN') {
        throw Object.assign(new Error('Groq key missing'), { code: 'AI_CONFIG' });
    }
    if (Date.now() < blockedUntil) {
        throw Object.assign(new Error('Groq cooldown'), {
            code: 'AI_RATE_LIMIT', retryAfter: Math.ceil((blockedUntil - Date.now()) / 1000)
        });
    }
    const response = await fetch(ENDPOINT, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(45000),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
            model, messages, stream: false, temperature: 0.5, max_completion_tokens: 1024,
            ...(model.startsWith('openai/gpt-oss-') ? { reasoning_effort: 'low', include_reasoning: false } : {})
        })
    });
    if (!response.ok) {
        const retryAfter = retrySeconds(response.headers.get('retry-after'));
        if (response.status === 429) blockedUntil = Date.now() + retryAfter * 1000;
        await response.body?.cancel().catch(() => {});
        throw Object.assign(new Error('Groq request rejected'), {
            status: response.status,
            code: response.status === 429 ? 'AI_RATE_LIMIT'
                : [401, 403].includes(response.status) ? 'AI_AUTH' : 'AI_HTTP',
            retryAfter
        });
    }
    const data = await response.json();
    // Never return internal reasoning, API bodies or tool calls to Discord.
    return { message: { content: data.choices?.[0]?.message?.content } };
}
module.exports = { requestChat, getModel, retrySeconds };
