const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const app = express();
const PORT = process.env.PORT || 3000;

// ── Aapki RapidAPI Key yahan daalo ──
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || 'APNI_KEY_YAHAN_DAALO';

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
    res.json({ status: 'StreamVault Backend Running ✅' });
});

// ── Main Download Route ──
app.get('/download', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL required' });
    }

    try {
        const response = await fetch(
            `https://social-media-video-downloader.p.rapidapi.com/smvd/get/all?url=${encodeURIComponent(url)}`,
            {
                method: 'GET',
                headers: {
                    'X-RapidAPI-Key': RAPIDAPI_KEY,
                    'X-RapidAPI-Host': 'social-media-video-downloader.p.rapidapi.com'
                }
            }
        );

        if (!response.ok) {
            const status = response.status;
            if (status === 401 || status === 403) return res.status(403).json({ error: 'API key invalid' });
            if (status === 429) return res.status(429).json({ error: 'Monthly limit reached' });
            return res.status(500).json({ error: 'Server error: ' + status });
        }

        const data = await response.json();
        res.json(data);

    } catch (err) {
        res.status(500).json({ error: 'Something went wrong: ' + err.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ StreamVault backend running on port ${PORT}`);
});
