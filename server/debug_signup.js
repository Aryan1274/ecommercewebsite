const axios = require('axios');

(async () => {
    try {
        const res = await axios.post('http://localhost:5000/api/auth/signup', {
            name: 'Test Debug User',
            email: `test_debug_${Date.now()}@example.com`,
            password: 'testpassword123'
        });
        console.log('Signup succeeded:', res.status, res.data);
    } catch (err) {
        if (err.response) {
            console.error('Signup failed with status:', err.response.status);
            console.error('Response data:', JSON.stringify(err.response.data));
        } else {
            console.error('Network error:', err.message);
        }
    }
})();
