const axios = require('axios');

async function checkModels() {
    const key = 'AIzaSyAZzc8OZYWBY_DLLBeUUMPpzvV5C30fmyU';
    try {
        const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const models = response.data.models.map(m => m.name);
        require('fs').writeFileSync('gemini_models.json', JSON.stringify(models, null, 2));
        console.log("Models saved to gemini_models.json");
    } catch (e) {
        console.error("Error fetching models:", e.message);
    }
}
checkModels();
