const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

function generateTrackingId() {
    return Math.random().toString(36).substring(2, 12).toUpperCase();
}

async function update() {
    const db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });

    try {
        console.log('Adding tracking_id column to orders table...');
        try {
            await db.run('ALTER TABLE orders ADD COLUMN tracking_id TEXT');
        } catch (e) {
            console.log('Column tracking_id might already exist.');
        }

        console.log('Backfilling tracking_id for existing orders...');
        const orders = await db.all('SELECT id FROM orders WHERE tracking_id IS NULL');

        for (const order of orders) {
            const trackingId = generateTrackingId();
            await db.run('UPDATE orders SET tracking_id = ? WHERE id = ?', [trackingId, order.id]);
            console.log(`Updated order ${order.id} with tracking ID: ${trackingId}`);
        }

        console.log('Database update v3 complete.');
    } catch (error) {
        console.error('Error updating database:', error);
    } finally {
        await db.close();
    }
}

update();
