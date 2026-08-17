require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const googleTTS = require('google-tts-api');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/chat', upload.single('audio'), async (req, res) => {
    try {
        console.log("🎙️ Robot sent audio!");
        
        // 1. දැනට Speech-to-Text ටෙස්ට් කරන්න අපි dummy ප්‍රශ්නයක් දාමු
        const userQuestion = "What is a black hole?"; 
        console.log("👦 Child asked:", userQuestion);

        // 2. ඔයාගේ API Key එකෙන් AI එකට කතා කිරීම (Gemini/OpenAI අනුකූල)
        const apiKey = process.env.AI_API_KEY;
        const aiResponse = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            contents: [{ parts: [{ text: `You are a friendly educational robot for kids aged 8-12. Answer in 2 short sentences simply: ${userQuestion}` }] }]
        });
        
        // AI එකෙන් එන උත්තරේ ගන්නවා
        const answerText = aiResponse.data.candidates[0].content.parts[0].text.replace(/\*/g, '');
        console.log("🤖 AI Answer:", answerText);

        // 3. ඒ උත්තරේ කටහඬක් (MP3) කරනවා
        const audioUrl = googleTTS.getAudioUrl(answerText, {
            lang: 'en',
            slow: false,
            host: 'https://translate.google.com',
        });

        // 4. MP3 ලින්ක් එක රොබෝට යවනවා
        res.json({ 
            success: true, 
            text: answerText,
            audioUrl: audioUrl 
        });

    } catch (error) {
        console.error("❌ Error:", error.message);
        res.status(500).json({ success: false, error: "Brain error!" });
    }
});

// Render එකෙන් දෙන PORT එකට සර්වර් එක සම්බන්ධ කිරීම
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ SmartEduBuddy Brain is running on port ${PORT}`);
});