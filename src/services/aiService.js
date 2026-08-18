const API_KEY = process.env.GEMINI_API_KEY;

// List of candidate model names in order of preference
const MODEL_CANDIDATES = [
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
    "gemini-2.0-flash",
    "gemini-pro"
];

/**
 * Call Google Gemini REST API with a specific model name.
 */
async function callGeminiApi(modelName, promptText) {
    // Strip leading 'models/' prefix if present to construct clean URL
    const cleanModelName = modelName.replace(/^models\//, '');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModelName}:generateContent?key=${API_KEY}`;
    
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
        return { success: false, error: "Empty response body" };
    }

    let data;
    try {
        data = JSON.parse(rawText);
    } catch (parseError) {
        return { success: false, error: `JSON parse error: ${rawText.substring(0, 100)}` };
    }

    if (data.error) {
        return { success: false, error: data.error.message || JSON.stringify(data.error) };
    }

    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        const text = data.candidates[0].content.parts[0].text.trim().replace(/[\*\_#\`]/g, '');
        if (text.length > 0) {
            return { success: true, text: text };
        }
    }

    return { success: false, error: "No candidate text returned" };
}

/**
 * Query Gemini AI with automatic model fallback sequence.
 */
async function queryGemini(promptText) {
    const defaultFallback = "ආයුබෝවන් යාලුවා!";

    if (!API_KEY) {
        console.warn("[aiService Warning]: GEMINI_API_KEY environment variable is missing. Returning fallback.");
        return defaultFallback;
    }

    for (const model of MODEL_CANDIDATES) {
        try {
            const result = await callGeminiApi(model, promptText);
            if (result.success && result.text) {
                console.log(`[aiService Success]: Generated reply using model '${model}'`);
                return result.text;
            }
            console.warn(`[aiService Warning]: Model '${model}' failed (${result.error}). Trying next candidate...`);
        } catch (err) {
            console.warn(`[aiService Exception]: Model '${model}' exception: ${err.message}. Trying next candidate...`);
        }
    }

    console.error("[aiService Error]: All Gemini model candidates failed. Returning fallback.");
    return defaultFallback;
}

module.exports = { queryGemini };