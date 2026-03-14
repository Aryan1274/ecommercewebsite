const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

(async () => {
    const db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });

    const sql = `SELECT COUNT(*) as total FROM products p JOIN categories c ON p.category_id = c.id WHERE 1=1 AND c.name = ? COLLATE NOCASE AND p.id IN (SELECT product_id FROM product_variants WHERE size IN (?))`;
    const params = ['Men', 'L'];

    console.log('Query:', sql);
    console.log('Params:', params);

    const res = await db.get(sql, params);
    console.log('Result:', res);

    const subqueryRes = await db.all('SELECT product_id FROM product_variants WHERE size IN (?)', ['L']);
    console.log('Subquery Result IDs:', subqueryRes);
})();
