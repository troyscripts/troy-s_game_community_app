'use strict';
const {platformRequest} = require('../../utils/platformRequest');
const uploads = new Map();
async function api(resource, params) {
    const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    // Header keeps the API key out of URLs and diagnostics.
    const {response, data} = await platformRequest(url.href, {headers: {'X-Goog-Api-Key': process.env.YOUTUBE_API_KEY}}, {
        allowedHosts: ['www.googleapis.com'],
        read: async response => { if (!response.ok) { await response.body?.cancel(); return null; } return response.json(); }
    });
    if (!response.ok) throw new Error(`YouTube-API: HTTP ${response.status}; controleer API-sleutel, API-toegang en quota.`);
    if (!Array.isArray(data?.items)) throw new Error('YouTube-API: ongeldige videolijst.');
    return data;
}
async function youtubeApi(channelId) {
    if (!/^UC[\w-]{22}$/.test(channelId)) throw new Error('YouTube-API: ongeldig kanaal-ID.');
    let cached = uploads.get(channelId);
    if (!cached || cached.until <= Date.now()) {
        const result = await api('channels', {part: 'contentDetails', id: channelId});
        const channel = result.items.find(item => item.id === channelId);
        const playlist = channel?.contentDetails?.relatedPlaylists?.uploads;
        if (!playlist || !/^[\w-]+$/.test(playlist)) throw new Error('YouTube-API: uploadlijst van het kanaal niet gevonden.');
        cached = {playlist, until: Date.now() + 6 * 3600000};
        uploads.set(channelId, cached);
    }
    const result = await api('playlistItems', {part: 'snippet,contentDetails', playlistId: cached.playlist, maxResults: '50'});
    const items = result.items.map(item => {
        const id = item.contentDetails?.videoId;
        const published = Date.parse(item.contentDetails?.videoPublishedAt);
        if (item.snippet?.channelId !== channelId || !/^[\w-]{11}$/.test(id || '') || !Number.isFinite(published)) {
            throw new Error('YouTube-API: video of kanaalidentiteit ongeldig; niets als verwerkt opgeslagen.');
        }
        return {id, published, title: item.snippet.title || 'Nieuwe video', url: `https://www.youtube.com/watch?v=${id}`, image: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`};
    });
    return {resolvedId: channelId, items, source: 'api'};
}
module.exports = {youtubeApi};
