const axios = require('axios');

(async () => {
    try {
        console.log('--- FETCHING SIZE L ---');
        const res = await axios.get('http://localhost:5000/api/products?category=Men&sizes=L');
        console.log('Total:', res.data.totalCount);
        console.log('Product IDs:', res.data.products.map(p => p.id));
    } catch (e) {
        console.error(e.message);
    }
})();
