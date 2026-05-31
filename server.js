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

app.get('/download', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL required' });
    if (!RAPIDAPI_KEY) return res.status(500).json({ error: 'API key not set' });

    // Detect platform
    const isYouTube = /youtube\.com|youtu\.be/.test(url);
    const isInsta   = /instagram\.com/.test(url);
    const isTikTok  = /tiktok\.com/.test(url);

    try {

        // ── YouTube ──────────────────────────────────────────
        if (isYouTube) {
            const ytRes = await fetch(
                `https://youtube-mp36.p.rapidapi.com/dl?id=${extractYTId(url)}`,
                {
                    method: 'GET',
                    headers: {
                        'X-RapidAPI-Key': RAPIDAPI_KEY,
                        'X-RapidAPI-Host': 'youtube-mp36.p.rapidapi.com'
                    }
                }
            );
            if (ytRes.ok) {
                const d = await ytRes.json();
                if (d.link) {
                    return res.json({
                        title: d.title || 'YouTube Video',
                        links: [
                            { quality: 'MP3 Audio', url: d.link, extension: 'mp3' }
                        ]
                    });
                }
            }
        }

        // ── Universal downloader (YouTube, Insta, TikTok, Facebook etc) ──
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
            // Normalize response
            const links = [];
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
            if (links.length) {
                return res.json({ title: d.title || 'Video', links });
            }
        }

        // ── Fallback: All Video Downloader ───────────────────
        const fallRes = await fetch(
            `https://all-video-downloader1.p.rapidapi.com/download?url=${encodeURIComponent(url)}`,
            {
                method: 'GET',
                headers: {
                    'X-RapidAPI-Key': RAPIDAPI_KEY,
                    'X-RapidAPI-Host': 'all-video-downloader1.p.rapidapi.com'
                }
            }
        );

        if (fallRes.ok) {
            const d = await fallRes.json();
            return res.json(d);
        }

        return res.status(404).json({ error: 'Could not fetch video. Try another URL or platform.' });

    } catch (err) {
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

// Extract YouTube video ID
function extractYTId(url) {
    const match = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : '';
}

app.listen(PORT, () => console.log(`✅ StreamVault running on port ${PORT}`));
