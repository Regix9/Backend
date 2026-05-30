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

    try {
        // API 1: All Video Downloader
        const response = await fetch(
            `https://all-video-downloader1.p.rapidapi.com/download?url=${encodeURIComponent(url)}`,
            {
                method: 'GET',
                headers: {
                    'X-RapidAPI-Key': RAPIDAPI_KEY,
                    'X-RapidAPI-Host': 'all-video-downloader1.p.rapidapi.com'
                }
            }
        );

        if (!response.ok) {
            // API 2: Fallback — Video Downloader API
            const res2 = await fetch(
                `https://video-downloader-api1.p.rapidapi.com/?url=${encodeURIComponent(url)}`,
                {
                    method: 'GET',
                    headers: {
                        'X-RapidAPI-Key': RAPIDAPI_KEY,
                        'X-RapidAPI-Host': 'video-downloader-api1.p.rapidapi.com'
                    }
                }
            );

            if (!res2.ok) return res.status(500).json({ error: 'Both APIs failed. Try another URL.' });
            const data2 = await res2.json();
            return res.json(data2);
        }

        const data = await response.json();
        res.json(data);

    } catch (err) {
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

app.listen(PORT, () => console.log(`✅ StreamVault running on port ${PORT}`));
