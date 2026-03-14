const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function seed() {
    const db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });

    const products = [
        { name: 'Classic Cotton Tee', description: 'Soft and breathable 100% cotton t-shirt.', price: 19.99, category_id: 1, comfort_level: 'High', is_recommended: 1 },
        { name: 'Relaxed Fit Jeans', description: 'Comfortable stretch denim jeans.', price: 49.99, category_id: 1, comfort_level: 'Very High', is_recommended: 1 },
        { name: 'Linen Summer Dress', description: 'Lightweight linen dress for warm days.', price: 59.99, category_id: 2, comfort_level: 'High', is_recommended: 1 },
        { name: 'Casual Knit Sweater', description: 'Warm and cozy knit sweater.', price: 39.99, category_id: 2, comfort_level: 'Extreme', is_recommended: 1 },
        { name: 'Soft Jogger Set', description: 'Matching soft joggers for kids.', price: 29.99, category_id: 3, comfort_level: 'Extreme', is_recommended: 1 },
        { name: 'Organic Cotton Onesie', description: 'Gentle on skin cotton onesie.', price: 14.99, category_id: 3, comfort_level: 'Extreme', is_recommended: 0 },
        { name: 'Comfort Hoodie', description: 'Everyday comfort hoodie.', price: 34.99, category_id: 1, comfort_level: 'High', is_recommended: 0 },
        { name: 'Stretch Chinos', description: 'Versatile stretch chinos for women.', price: 44.99, category_id: 2, comfort_level: 'High', is_recommended: 0 }
    ];

    for (const p of products) {
        await db.run(
            'INSERT INTO products (name, description, price, category_id, comfort_level, is_recommended) VALUES (?, ?, ?, ?, ?, ?)',
            [p.name, p.description, p.price, p.category_id, p.comfort_level, p.is_recommended]
        );
    }

    console.log('Seeding complete.');
    await db.close();
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
