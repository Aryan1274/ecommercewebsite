const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

(async () => {
    const db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });
    console.log('--- ALL PRODUCTS ---');
    console.log(JSON.stringify(await db.all('SELECT id, name, stock FROM products'), null, 2));
})();
