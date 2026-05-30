const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const app = express();
const PORT = process.env.PORT || 3000;

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';

// CORS â€” sab sites ko allow karo
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
    res.json({ status: 'StreamVault Backend Running âœ…' });
});

// Download route
app.get('/download', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL required' });
    }

    if (!RAPIDAPI_KEY) {
        return res.status(500).json({ error: 'API key not configured on server' });
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
            if (status === 401 || status === 403) return res.status(403).json({ error: 'Invalid API key' });
            if (status === 429) return res.status(429).json({ error: 'Monthly limit reached' });
            return res.status(500).json({ error: 'RapidAPI error: ' + status });
        }

        const data = await response.json();
        res.json(data);

    } catch (err) {
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

app.listen(PORT, () => {
    console.log(`âœ… StreamVault backend running on port ${PORT}`);
});
