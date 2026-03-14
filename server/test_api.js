const axios = require('axios');

(async () => {
    try {
        console.log('--- FETCHING ALL (No Filters) ---');
        let res = await axios.get('http://localhost:5000/api/products?category=Men');
        console.log('Total:', res.data.totalCount);

        console.log('--- FETCHING SIZE S ---');
        res = await axios.get('http://localhost:5000/api/products?category=Men&sizes=S');
        console.log('Total:', res.data.totalCount);

        console.log('--- FETCHING SIZE L ---');
        res = await axios.get('http://localhost:5000/api/products?category=Men&sizes=L');
        console.log('Total:', res.data.totalCount);
    } catch (e) {
        console.error(e.message);
    }
})();
