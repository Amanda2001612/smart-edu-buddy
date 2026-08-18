const express = require('express');
const router = express.Router();
const googleTTS = require('google-tts-api');
const https = require('https');
const { queryGemini } = require('../services/aiService');

let latestAudioUrl = "";

// 1. ප්‍රශ්න භාරගන්නා Endpoint (රොබෝ කතා කරන්නේ මෙතැනටයි)
router.post('/api/chat', async (expressReq, res) => {
    try {
        let reqBody = expressReq.body;

        // body එක string එකක් ලෙස ආවොත් එය JSON වලට හැරවීම
        if (typeof reqBody === 'string' && reqBody.length > 0) {
            try {
                reqBody = JSON.parse(reqBody);
            } catch (e) {
                // Parse කරගන්න බැරි වුණොත් raw string එක message එක ලෙස ගැනීම
                reqBody = { message: reqBody };
            }
        }

        // රොබෝ එවන "message" හෝ "prompt" එක ආරක්ෂිතව ලබාගැනීම
        const prompt = reqBody?.prompt || reqBody?.message || expressReq.query?.prompt || expressReq.query?.q || "Hello";
        
        const hostAddress = expressReq.headers.host || "smart-edu-buddy.onrender.com";
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
        const hostAddress = expressReq.headers.host || "smart-edu-buddy.onrender.com";
        
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