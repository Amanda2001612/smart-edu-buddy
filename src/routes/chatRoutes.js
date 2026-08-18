const express = require('express');
const router = express.Router();
const googleTTS = require('google-tts-api');
const https = require('https');
const { queryGemini } = require('../services/aiService');

let latestAudioUrl = "";

// 1. ප්‍රශ්න භාරගන්නා Endpoint (රොබෝ කතා කරන්නේ මෙතැනටයි)
router.post('/api/chat', async (req, res) => {
    try {
        // රොබෝ එවන "message" හෝ "prompt" එක ආරක්ෂිතව ලබාගැනීම
        const prompt = req.body?.prompt || req.body?.message || req.query?.prompt || req.query?.q;
        
        if (!prompt) {
            return res.status(400).json({ success: false, error: "Prompt required" });
        }

        const hostAddress = req.headers.host || "smart-edu-buddy.onrender.com";
        console.log(`\n[Child Query Received]: ${prompt}`);

        const reply = await queryGemini(prompt);
        console.log(`[AI Reply]: ${reply}`);

        const lang = /[\u0D80-\u0DFF]/.test(reply) ? 'si' : 'en';
        
        // අකුරු 200 සීමාවට ගැලපෙන සේ සැකසීම
        const safeReply = reply.length > 190 ? reply.substring(0, 190) : reply;

        latestAudioUrl = googleTTS.getAudioUrl(safeReply, { 
            lang: lang, slow: false, host: 'https://translate.google.com', timeout: 10000
        });
        
        res.status(200).json({ 
            success: true,
            answer: safeReply, 
            lang: lang, 
            audioUrl: `https://${hostAddress}/audio.mp3` 
        });

    } catch (error) {
        console.error("[Error]:", error.message);
        const fallback = "මට තේරුණේ නැහැ යාලුවා, ආයෙත් කියන්නකෝ!";
        const hostAddress = req.headers.host || "smart-edu-buddy.onrender.com";
        
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

// පරණ /ask ලින්ක් එකටත් වැඩ කරන්න අවශ්‍ය නම් මෙන්න
router.post('/ask', async (req, res) => {
    req.url = '/api/chat';
    router.handle(req, res);
});

// 2. Audio Stream Endpoint - Buffer Method එක
router.get('/audio.mp3', (req, res) => {
    if (!latestAudioUrl) return res.status(404).send("No audio stream available.");
    
    https.get(latestAudioUrl, (response) => {
        let data = [];
        response.on('data', (chunk) => data.push(chunk));
        response.on('end', () => {
            let audioBuffer = Buffer.concat(data);
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Length', audioBuffer.length);
            res.send(audioBuffer);
        });
    }).on('error', (err) => {
        res.status(500).send("Audio streaming error");
    });
});

module.exports = router;