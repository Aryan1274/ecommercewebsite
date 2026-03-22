const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');

(async () => {
    try {
        const db = await open({
            filename: './database.sqlite',
            driver: sqlite3.Database
        });

        console.log('Connected to database.');

        require('dotenv').config();
        const newPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        console.log('Hashing new password...');

        await db.run('UPDATE users SET password = ?', [hashedPassword]);

        console.log(`Successfully reset all passwords to "${newPassword}".`);

        await db.close();
    } catch (err) {
        console.error('Error resetting passwords:', err);
    }
})();
