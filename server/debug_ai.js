const { askAI } = require('./aiService');

const keys = [
    { provider: 'Gemini', api_key: 'AIzaSyAZzc8OZYWBY_DLLBeUUMPpzvV5C30fmyU' }
];

async function run() {
    try {
        console.log("Testing Gemini...");
        const result = await askAI([{ role: 'user', content: 'hello' }], keys);
        console.log("Success:", result);
    } catch (e) {
        require('fs').writeFileSync('debug_output.json', JSON.stringify({ message: e.message, stack: e.stack }, null, 2));
        console.error("DEBUG ERROR saved to debug_output.json");
    }
}
run();
