const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

(async () => {
    const db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });
    console.log('--- PRODUCTS ---');
    console.log(JSON.stringify(await db.all('SELECT id, name, stock FROM products'), null, 2));

    console.log('--- VARIANTS ---');
    console.log(JSON.stringify(await db.all('SELECT * FROM product_variants'), null, 2));

    console.log('--- LATEST ORDERS ---');
    const orders = await db.all('SELECT * FROM orders ORDER BY id DESC LIMIT 2');
    console.log(JSON.stringify(orders, null, 2));

    if (orders.length > 0) {
        console.log('--- ITEMS FOR LATEST ORDER ---');
        console.log(JSON.stringify(await db.all('SELECT * FROM order_items WHERE order_id = ?', [orders[0].id]), null, 2));
    }
})();
