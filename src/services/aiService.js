const API_KEY = process.env.GEMINI_API_KEY;
const activeModelName = "gemini-1.0-pro";

async function queryGemini(promptText) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModelName}:generateContent?key=${API_KEY}`;
    
    const systemPrompt = `You are SmartEduBuddy, a friendly, loving, and encouraging educational AI robot companion for children aged 8 to 12. 
    Instructions: 
    1. Answer the child's question warmly, kindly, and educationally. 
    2. Keep answers EXTREMELY short.
    3. If Sinhala, reply in simple, friendly Sinhala (උපරිම වචන 10ක් ඇතුළත සරල සිංහලෙන්). 
    4. Child's Question: "${promptText}"`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        return data.candidates[0].content.parts[0].text.trim().replace(/[\*\_#]/g, '');
    }
    throw new Error("No response from AI.");
}

module.exports = { queryGemini };