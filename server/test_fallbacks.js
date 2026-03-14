require('dotenv').config();
const groqKey = process.env.GROQ_API_KEY;
const openrouterKey = process.env.OPENROUTER_API_KEY;

async function testGroq() {
    console.log('Testing Groq...');
    try {
        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            { model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: 'hi' }], max_tokens: 50 },
            { headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' } }
        );
        console.log('GROQ SUCCESS:', response.data.choices[0].message.content);
    } catch (e) {
        const err = { status: e.response?.status, data: e.response?.data };
        console.log('GROQ ERROR:', JSON.stringify(err, null, 2));
    }
}

async function testOpenRouter() {
    console.log('\nTesting OpenRouter...');
    // Using a model that is more reliably free
    const model = 'meta-llama/llama-3.3-70b-instruct:free';
    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            { model, messages: [{ role: 'user', content: 'hi' }], max_tokens: 50 },
            { headers: { 'Authorization': `Bearer ${openrouterKey}`, 'Content-Type': 'application/json' } }
        );
        console.log('OPENROUTER SUCCESS:', response.data.choices[0].message.content);
    } catch (e) {
        const err = { status: e.response?.status, data: e.response?.data };
        console.log('OPENROUTER ERROR:', JSON.stringify(err, null, 2));
    }
}

async function run() {
    await testGroq();
    await testOpenRouter();
}
run();
