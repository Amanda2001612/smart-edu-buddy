const express = require('express');
const router = express.Router();
const googleTTS = require('google-tts-api');
const https = require('https');
const { queryGemini } = require('../services/aiService');

let latestAudioUrl = "";

// 1. ප්‍රශ්න භාරගන්නා Endpoint (රොබෝ කතා කරන්නේ මෙතැනටයි)
router.all(['/ask', '/api/chat'], async (req, res) => {
    // රොබෝ එවන "message" එක හඳුනාගැනීම
    const prompt = req.body.prompt || req.body.message || req.query.prompt || req.query.q;
    if (!prompt) return res.status(400).json({ success: false, error: "Prompt required" });

    // Render එකේ URL එක ලබා ගැනීම
    const hostAddress = req.headers.host || "smart-edu-buddy.onrender.com";
    console.log(`\n[Child Query Received]: ${prompt}`);

    try {
        const reply = await queryGemini(prompt);
        console.log(`[AI Reply]: ${reply}`);

        const lang = /[\u0D80-\u0DFF]/.test(reply) ? 'si' : 'en';
        
        // අකුරු 200 සීමාවට ගැලපෙන සේ සැකසීම (TTS Error එක මඟ හැරීමට)
        const safeReply = reply.length > 190 ? reply.substring(0, 190) : reply;

        latestAudioUrl = googleTTS.getAudioUrl(safeReply, { 
            lang: lang, slow: false, host: 'https://translate.google.com', timeout: 10000
        });
        
        // https සමඟින් audio URL එක රොබෝට යැවීම
        res.status(200).json({ 
            success: true,
            answer: safeReply, 
            lang: lang, 
            audioUrl: `https://${hostAddress}/audio.mp3` 
        });

    } catch (error) {
        console.error("[Error]:", error.message);
        const fallback = "මට තේරුණේ නැහැ යාලුවා, ආයෙත් කියන්නකෝ!";
        
        latestAudioUrl = googleTTS.getAudioUrl(fallback, { 
            lang: 'si', slow: false, host: 'https://translate.google.com', timeout: 10000 
        });
        
        res.status(200).json({ 
            success: false,
            answer: fallback, 
            lang: 'si', 
            audioUrl: `https://${hostAddress}/audio.mp3` 
        });
    }
});

// 2. Audio Stream Endpoint (රොබෝ සින්දුව අහන තැන)
router.get('/audio.mp3', (req, res) => {
    if (!latestAudioUrl) return res.status(404).send("No audio stream available.");
    https.get(latestAudioUrl, (stream) => {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Accept-Ranges', 'bytes');
        stream.pipe(res);
    }).on('error', (err) => {
        res.status(500).send("Audio streaming error");
    });
});

module.exports = router;