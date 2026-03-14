const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

(async () => {
    const db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });
    console.log('--- PRODUCT VARIANTS ---');
    console.log(JSON.stringify(await db.all('SELECT * FROM product_variants'), null, 2));
})();
