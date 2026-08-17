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
        console.log("🎙️ Robot sent a request!");
        
        const userQuestion = "What is a black hole?"; 
        console.log("👦 Child asked:", userQuestion);

        const apiKey = process.env.AI_API_KEY;
        
        if (!apiKey) {
            throw new Error("API Key is missing in Render Environment!");
        }

        // URL එක වෙනුවට Header එකෙන් API Key එක යැවීම
        const aiResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`, 
            {
                contents: [{ parts: [{ text: `You are a friendly educational robot for kids aged 8-12. Answer in 2 short sentences simply: ${userQuestion}` }] }]
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey // නිවැරදිව Key එක යවන ක්‍රමය
                }
            }
        );
        
        const answerText = aiResponse.data.candidates[0].content.parts[0].text.replace(/\*/g, '');
        console.log("🤖 AI Answer:", answerText);

        const audioUrl = googleTTS.getAudioUrl(answerText, {
            lang: 'en',
            slow: false,
            host: 'https://translate.google.com',
        });

        res.json({ 
            success: true, 
            text: answerText,
            audioUrl: audioUrl 
        });

    } catch (error) {
        // Google එකෙන් එන නියම Error එක Render Logs වල පෙන්වීමට
        if (error.response) {
            console.error("❌ Google API Error:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("❌ System Error:", error.message);
        }
        res.status(500).json({ success: false, error: "Brain error!" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ SmartEduBuddy Brain is running on port ${PORT}`);
});