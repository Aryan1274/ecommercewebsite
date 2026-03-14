const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function checkKeys() {
    const db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });

    const keys = await db.all('SELECT * FROM ai_api_keys');
    console.log('--- AI API KEYS IN DB ---');
    keys.forEach(k => {
        console.log(`ID: ${k.id}, Provider: ${k.provider}, Active: ${k.is_active}, Key (start): ${k.api_key.substring(0, 8)}`);
    });
    await db.close();
}

checkKeys();
