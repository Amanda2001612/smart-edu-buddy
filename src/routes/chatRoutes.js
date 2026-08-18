const express = require('express');
const router = express.Router();
const googleTTS = require('google-tts-api');
const https = require('https');
const http = require('http');
const { queryGemini } = require('../services/aiService');

let latestAudioUrl = "";
let latestAudioBuffer = null;

/**
 * Robustly fetch audio stream from URL using https/http modules with redirect support and custom User-Agent.
 */
function fetchAudioStream(url, callback, maxRedirects = 5) {
    if (!url) return callback(new Error("No URL provided"));
    if (maxRedirects <= 0) return callback(new Error("Too many redirects"));

    const options = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*'
        }
    };

    const client = url.startsWith('https') ? https : http;

    const req = client.get(url, options, (response) => {
        // Handle HTTP redirects (301, 302, 303, 307, 308)
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            let redirectUrl = response.headers.location;
            if (!redirectUrl.startsWith('http')) {
                const parsedUrl = new URL(url);
                redirectUrl = `${parsedUrl.protocol}//${parsedUrl.host}${redirectUrl}`;
            }
            return fetchAudioStream(redirectUrl, callback, maxRedirects - 1);
        }

        if (response.statusCode !== 200) {
            return callback(new Error(`HTTP status code ${response.statusCode}`));
        }

        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
            const buffer = Buffer.concat(chunks);
            callback(null, buffer);
        });
        response.on('error', (err) => callback(err));
    });

    req.on('error', (err) => callback(err));
    req.setTimeout(10000, () => {
        req.destroy();
        callback(new Error("Request timeout while fetching audio stream"));
    });
}

router.all(['/api/chat', '/ask'], async (req, res) => {
    try {
        let prompt = "Hello SmartEduBuddy!";

        if (req.body) {
            if (typeof req.body === 'object' && req.body !== null) {
                prompt = req.body.message || req.body.prompt || req.body.q || req.body.text || prompt;
            } else if (typeof req.body === 'string' && req.body.trim().length > 0) {
                const trimmed = req.body.trim();
                try {
                    const parsed = JSON.parse(trimmed);
                    if (typeof parsed === 'object' && parsed !== null) {
                        prompt = parsed.message || parsed.prompt || parsed.q || parsed.text || trimmed;
                    } else {
                        prompt = trimmed;
                    }
                } catch (e) {
                    prompt = trimmed;
                }
            }
        }

        if (req.query?.prompt) prompt = req.query.prompt;
        if (req.query?.q) prompt = req.query.q;
        if (req.query?.message) prompt = req.query.message;

        const hostAddress = req.headers.host || "smart-edu-buddy.onrender.com";
        console.log(`\n[Child Query Received]: ${prompt}`);

        let reply = "";
        try {
            reply = await queryGemini(prompt);
        } catch (aiErr) {
            console.error("[Gemini AI Error]:", aiErr.message);
            reply = "ආයුබෝවන් යාලුවා!";
        }

        if (!reply || typeof reply !== 'string' || reply.trim().length === 0) {
            reply = "ආයුබෝවන් යාලුවා!";
        }

        console.log(`[AI Reply]: ${reply}`);

        const lang = /[\u0D80-\u0DFF]/.test(reply) ? 'si' : 'en';
        const safeReply = reply.length > 190 ? reply.substring(0, 190) : reply;

        try {
            latestAudioUrl = googleTTS.getAudioUrl(safeReply, {
                lang: lang,
                slow: false,
                host: 'https://translate.google.com',
                timeout: 10000
            });

            // Reset and pre-fetch audio buffer into memory for immediate serving
            latestAudioBuffer = null;
            fetchAudioStream(latestAudioUrl, (err, buffer) => {
                if (!err && buffer && buffer.length > 0) {
                    latestAudioBuffer = buffer;
                }
            });
        } catch (ttsErr) {
            console.error("[TTS Generation Error]:", ttsErr.message);
        }

        res.status(200).json({
            success: true,
            answer: safeReply,
            lang: lang,
            audioUrl: `https://${hostAddress}/audio.mp3`
        });

    } catch (error) {
        console.error("[Error]:", error.message);
        const fallback = "ආයුබෝවන් යාලුවා!";
        const hostAddress = req.headers.host || "smart-edu-buddy.onrender.com";

        try {
            latestAudioUrl = googleTTS.getAudioUrl(fallback, {
                lang: 'si',
                slow: false,
                host: 'https://translate.google.com',
                timeout: 10000
            });
            latestAudioBuffer = null;
            fetchAudioStream(latestAudioUrl, (err, buffer) => {
                if (!err && buffer && buffer.length > 0) {
                    latestAudioBuffer = buffer;
                }
            });
        } catch (ttsErr) {
            console.error("[TTS Fallback Error]:", ttsErr.message);
        }

        res.status(200).json({
            success: true,
            answer: fallback,
            lang: 'si',
            audioUrl: `https://${hostAddress}/audio.mp3`
        });
    }
});

router.get('/audio.mp3', (req, res) => {
    const serveBuffer = (buffer) => {
        if (!buffer || buffer.length === 0) {
            return res.status(500).set('Content-Type', 'text/plain').send("Audio streaming error");
        }

        const totalLength = buffer.length;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10) || 0;
            const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;

            if (start >= totalLength || end >= totalLength) {
                res.setHeader('Content-Range', `bytes */${totalLength}`);
                return res.status(416).send('Requested Range Not Satisfiable');
            }

            const chunk = buffer.slice(start, end + 1);
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${totalLength}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunk.length,
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            return res.end(chunk);
        } else {
            res.writeHead(200, {
                'Content-Type': 'audio/mpeg',
                'Content-Length': totalLength,
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            return res.end(buffer);
        }
    };

    // If pre-buffered audio is ready, serve immediately
    if (latestAudioBuffer && latestAudioBuffer.length > 0) {
        return serveBuffer(latestAudioBuffer);
    }

    if (!latestAudioUrl) {
        return res.status(404).set('Content-Type', 'text/plain').send("No audio stream available.");
    }

    // On-demand fetch if buffer not pre-loaded yet
    fetchAudioStream(latestAudioUrl, (err, audioBuffer) => {
        if (err || !audioBuffer || audioBuffer.length === 0) {
            console.error("[Audio Endpoint Error]:", err ? err.message : "Empty audio buffer");
            return res.status(500).set('Content-Type', 'text/plain').send("Audio streaming error");
        }

        latestAudioBuffer = audioBuffer;
        serveBuffer(audioBuffer);
    });
});

module.exports = router;