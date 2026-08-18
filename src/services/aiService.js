const API_KEY = process.env.GEMINI_API_KEY;
const activeModelName = "gemini-1.5-flash";

async function queryGemini(promptText) {
    const defaultFallback = "ආයුබෝවන් යාලුවා!";

    if (!API_KEY) {
        console.warn("[aiService Warning]: GEMINI_API_KEY environment variable is missing. Returning default response.");
        return defaultFallback;
    }

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModelName}:generateContent?key=${API_KEY}`;
        const systemPrompt = `You are SmartEduBuddy, a friendly, loving, and encouraging educational AI robot companion for children. Answer warmly and keep it extremely short (උපරිම වචන 10ක් ඇතුළත සරල සිංහලෙන්). Child's Question: "${promptText}"`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: systemPrompt }]
                }]
            })
        });

        const rawText = await response.text();
        if (!rawText || rawText.trim().length === 0) {
            console.error("[aiService Error]: Empty response body from Gemini API");
            return defaultFallback;
        }

        let data;
        try {
            data = JSON.parse(rawText);
        } catch (parseError) {
            console.error("[aiService Error]: Could not parse Gemini response as JSON:", rawText.substring(0, 100));
            return defaultFallback;
        }

        if (data.error) {
            console.error("[aiService Error]: Gemini API returned error:", data.error.message || data.error);
            return defaultFallback;
        }

        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            const text = data.candidates[0].content.parts[0].text.trim().replace(/[\*\_#\`]/g, '');
            if (text.length > 0) {
                return text;
            }
        }

        return defaultFallback;
    } catch (err) {
        console.error("[aiService Exception]:", err.message);
        return defaultFallback;
    }
}

module.exports = { queryGemini };