const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function update() {
    const db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });

    try {
        // Add columns to users table
        console.log('Adding specific columns to users table...');
        try { await db.run('ALTER TABLE users ADD COLUMN phone TEXT'); } catch (e) { }
        try { await db.run('ALTER TABLE users ADD COLUMN address TEXT'); } catch (e) { }
        try { await db.run('ALTER TABLE users ADD COLUMN city TEXT'); } catch (e) { }
        try { await db.run('ALTER TABLE users ADD COLUMN zip TEXT'); } catch (e) { }

        // Create wishlist table
        console.log('Creating wishlist table...');
        await db.exec(`
            CREATE TABLE IF NOT EXISTS wishlist (
                user_id INTEGER,
                product_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, product_id),
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (product_id) REFERENCES products (id)
            );
        `);

        console.log('Database update v2 complete.');
    } catch (error) {
        console.error('Error updating database:', error);
    } finally {
        await db.close();
    }
}

update();
