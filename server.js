const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const app = express();
const PORT = process.env.PORT || 3000;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.options('*', cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ status: 'StreamVault Backend Running ✅' });
});

// ── Test route — MP4 API ka raw response dekhne ke liye ──
app.get('/test-mp4', async (req, res) => {
    const { id } = req.query;
    if (!id) return res.json({ error: 'id required' });

    try {
        const r = await fetch(
            `https://youtube-mp4-downloader.p.rapidapi.com/mp4?id=${id}`,
            {
                method: 'GET',
                headers: {
                    'x-rapidapi-key': RAPIDAPI_KEY,
                    'x-rapidapi-host': 'youtube-mp4-downloader.p.rapidapi.com',
                    'Content-Type': 'application/json'
                }
            }
        );
        const text = await r.text();
        res.json({ status: r.status, body: text });
    } catch(e) {
        res.json({ error: e.message });
    }
});

app.get('/download', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL required' });
    if (!RAPIDAPI_KEY) return res.status(500).json({ error: 'API key not set' });

    const isYouTube = /youtube\.com|youtu\.be/.test(url);
    const ytId = extractYTId(url);

    try {
        const links = [];
        let title = 'Video';

        // ── YouTube MP4 ──
        if (isYouTube && ytId) {
            const mp4Res = await fetch(
                `https://youtube-mp4-downloader.p.rapidapi.com/mp4?id=${ytId}`,
                {
                    method: 'GET',
                    headers: {
                        'x-rapidapi-key': RAPIDAPI_KEY,
                        'x-rapidapi-host': 'youtube-mp4-downloader.p.rapidapi.com',
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (mp4Res.ok) {
                const d = await mp4Res.json();
                console.log('MP4 API response:', JSON.stringify(d));
                title = d.title || title;
                // Try all possible response formats
                if (d.url) links.push({ quality: '720p HD', url: d.url, extension: 'mp4' });
                if (d.downloadUrl) links.push({ quality: '720p HD', url: d.downloadUrl, extension: 'mp4' });
                if (d.link) links.push({ quality: '720p HD', url: d.link, extension: 'mp4' });
                if (d.qualities && Array.isArray(d.qualities)) {
                    d.qualities.forEach(q => {
                        const qUrl = q.url || q.link || q.downloadUrl;
                        if (qUrl) links.push({ quality: q.quality || q.label || 'MP4', url: qUrl, extension: 'mp4' });
                    });
                }
                if (d.formats && Array.isArray(d.formats)) {
                    d.formats.forEach(f => {
                        if (f.url) links.push({ quality: f.quality || f.resolution || 'MP4', url: f.url, extension: 'mp4' });
                    });
                }
                if (d.videos && Array.isArray(d.videos)) {
                    d.videos.forEach(v => {
                        if (v.url) links.push({ quality: v.quality || 'MP4', url: v.url, extension: 'mp4' });
                    });
                }
            }
        }

        // ── YouTube MP3 ──
        if (isYouTube && ytId) {
            const mp3Res = await fetch(
                `https://youtube-mp36.p.rapidapi.com/dl?id=${ytId}`,
                {
                    method: 'GET',
                    headers: {
                        'X-RapidAPI-Key': RAPIDAPI_KEY,
                        'X-RapidAPI-Host': 'youtube-mp36.p.rapidapi.com'
                    }
                }
            );
            if (mp3Res.ok) {
                const d = await mp3Res.json();
                if (!title || title === 'Video') title = d.title || title;
                if (d.link) links.push({ quality: 'MP3 Audio', url: d.link, extension: 'mp3' });
            }
        }

        // ── Other platforms ──
        if (!isYouTube) {
            const uniRes = await fetch(
                `https://social-download-all-in-one.p.rapidapi.com/v1/social/autolink`,
                {
                    method: 'POST',
                    headers: {
                        'X-RapidAPI-Key': RAPIDAPI_KEY,
                        'X-RapidAPI-Host': 'social-download-all-in-one.p.rapidapi.com',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ url })
                }
            );
            if (uniRes.ok) {
                const d = await uniRes.json();
                title = d.title || title;
                if (d.medias && d.medias.length) {
                    d.medias.forEach(m => {
                        if (m.url) links.push({
                            quality: m.quality || m.extension || 'Download',
                            url: m.url,
                            extension: m.extension || 'mp4',
                            size: m.size || ''
                        });
                    });
                }
            }
        }

        if (links.length === 0) {
            return res.status(404).json({ error: 'No download links found. Try another URL.' });
        }

        return res.json({ title, links });

    } catch (err) {
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

function extractYTId(url) {
    const match = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : '';
}

app.listen(PORT, () => console.log(`✅ StreamVault running on port ${PORT}`));
