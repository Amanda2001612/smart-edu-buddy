const express = require('express');
const router = express.Router();
const googleTTS = require('google-tts-api');
const https = require('https');
const { queryGemini } = require('../services/aiService');

let latestAudioUrl = "";

router.all(['/api/chat', '/ask'], async (req, res) => {
    try {
        let prompt = "Hello SmartEduBuddy!";
        
        // රොබෝ එවන ඕනෑම ආකාරයක දත්තයක් ආරක්ෂිතව කියවා ගැනීම
        if (req.body) {
            if (typeof req.body === 'string' && req.body.trim().length > 0) {
                try {
                    const parsed = JSON.parse(req.body);
                    prompt = parsed.message || parsed.prompt || req.body;
                } catch (e) {
                    prompt = req.body;
                }
            } else if (typeof req.body === 'object') {
                prompt = req.body.message || req.body.prompt || prompt;
            }
        }
        
        if (req.query?.prompt) prompt = req.query.prompt;
        if (req.query?.q) prompt = req.query.q;

        const hostAddress = req.headers.host || "smart-edu-buddy.onrender.com";
        console.log(`\n[Child Query Received]: ${prompt}`);

        const reply = await queryGemini(prompt);
        console.log(`[AI Reply]: ${reply}`);

        const lang = /[\u0D80-\u0DFF]/.test(reply) ? 'si' : 'en';
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
        const fallback = "ආයුබෝවන් යාලුවා!";
        const hostAddress = req.headers.host || "smart-edu-buddy.onrender.com";
        
        latestAudioUrl = googleTTS.getAudioUrl(fallback, { 
            lang: 'si', slow: false, host: 'https://translate.google.com', timeout: 10000 
        });
        
        res.status(200).json({ 
            success: true, // මෙතන true දමා ඇත, එවිට රොබෝ ක්‍රෑෂ් නොවී ශ්‍රව්‍ය ගොනුව ලබා ගනී
            answer: fallback, 
            lang: 'si', 
            audioUrl: `https://${hostAddress}/audio.mp3` 
        });
    }
});

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