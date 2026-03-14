require('dotenv').config();
const keys = {
    gemini: process.env.GEMINI_API_KEY,
    groq: process.env.GROQ_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY
};

async function testGemini() {
    console.log('Testing Gemini...');
    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${keys.gemini}`,
            { contents: [{ parts: [{ text: 'hi' }] }] },
            { headers: { 'Content-Type': 'application/json' } }
        );
        console.log('Gemini Success:', response.data.candidates[0].content.parts[0].text);
    } catch (e) {
        console.log('Gemini Error:', e.response?.status);
        console.log(JSON.stringify(e.response?.data, null, 2));
    }
}

async function testGroq() {
    console.log('\nTesting Groq...');
    try {
        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            { model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: 'hi' }] },
            { headers: { 'Authorization': `Bearer ${keys.groq}`, 'Content-Type': 'application/json' } }
        );
        console.log('Groq Success:', response.data.choices[0].message.content);
    } catch (e) {
        console.log('Groq Error:', e.response?.status);
        console.log(JSON.stringify(e.response?.data, null, 2));
    }
}

async function testOpenRouter() {
    console.log('\nTesting OpenRouter...');
    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            { model: 'meta-llama/llama-3.2-3b-instruct:free', messages: [{ role: 'user', content: 'hi' }] },
            { headers: { 'Authorization': `Bearer ${keys.openrouter}`, 'Content-Type': 'application/json' } }
        );
        console.log('OpenRouter Success:', response.data.choices[0].message.content);
    } catch (e) {
        console.log('OpenRouter Error:', e.response?.status);
        console.log(JSON.stringify(e.response?.data, null, 2));
    }
}

async function runTests() {
    await testGemini();
    await testGroq();
    await testOpenRouter();
}

runTests();
