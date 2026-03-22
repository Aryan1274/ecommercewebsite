const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { sendWelcomeEmail, sendOrderConfirmation, sendOrderStatusUpdate, sendOtpEmail } = require('./emailService');
const { askAI } = require('./aiService');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('CRITICAL ERROR: JWT_SECRET is not defined in .env');
    process.exit(1);
}

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// -- Rate Limiting --
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // Limit each IP to 50 attempts per hour
    message: { error: 'Too many login attempts, please try again after an hour' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply global limiter to all /api routes
app.use('/api/', apiLimiter);
// Apply strict limiter to auth routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);

// -- File Upload Setup --
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images (jpeg, jpg, png, webp) are allowed'));
    }
});

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});

let db;

(async () => {
    db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });
    console.log('Connected to the SQLite database.');

    // Ensure reviews table exists
    await db.exec(`
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            user_id INTEGER,
            rating INTEGER CHECK(rating >= 1 AND rating <= 5),
            comment TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products (id),
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    `);

    // Ensure wishlist table exists (fixing a missing table from initDb)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS wishlist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            product_id INTEGER,
            UNIQUE(user_id, product_id),
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (product_id) REFERENCES products (id)
        )
    `);

    // Ensure product_images table exists
    await db.exec(`
        CREATE TABLE IF NOT EXISTS product_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            image_url TEXT NOT NULL,
            alt_text TEXT,
            FOREIGN KEY (product_id) REFERENCES products (id)
        )
    `);

    // Ensure store_settings table exists
    await db.exec(`
        CREATE TABLE IF NOT EXISTS store_settings (
            id INTEGER PRIMARY KEY CHECK (id = 1), -- Only one row
            razorpay_enabled BOOLEAN DEFAULT 1
        )
    `);

    // Initialize default setting if table is empty
    await db.exec(`
        INSERT OR IGNORE INTO store_settings (id, razorpay_enabled) VALUES (1, 1)
    `);

    // Ensure product_variants table exists
    await db.exec(`
        CREATE TABLE IF NOT EXISTS product_variants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            size TEXT,
            color TEXT,
            stock INTEGER DEFAULT 0,
            sku TEXT UNIQUE,
            FOREIGN KEY (product_id) REFERENCES products (id)
        )
    `);

    // Add stock column to products table if it doesn't exist
    try {
        await db.exec('ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 10');
    } catch (e) {
        // Column might already exist
    }

    // Add size and color to order_items if they don't exist
    try {
        await db.exec('ALTER TABLE order_items ADD COLUMN size TEXT');
        await db.exec('ALTER TABLE order_items ADD COLUMN color TEXT');
    } catch (e) {
        // Columns might already exist
    }

    // Add razorpay columns to orders table
    try {
        await db.exec('ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT "pending"');
        await db.exec('ALTER TABLE orders ADD COLUMN razorpay_order_id TEXT');
        await db.exec('ALTER TABLE orders ADD COLUMN razorpay_payment_id TEXT');
        await db.exec('ALTER TABLE orders ADD COLUMN razorpay_signature TEXT');
    } catch (e) {
        // Columns might already exist
    }

    // Ensure coupons table exists
    await db.exec(`
        CREATE TABLE IF NOT EXISTS coupons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            discount_type TEXT NOT NULL, -- 'percent' or 'flat'
            discount_value REAL NOT NULL,
            min_purchase REAL DEFAULT 0,
            expiry_date DATETIME,
            is_active BOOLEAN DEFAULT 1
        )
    `);

    // Ensure otp_verifications table exists
    await db.exec(`
        CREATE TABLE IF NOT EXISTS otp_verifications (
            email TEXT PRIMARY KEY,
            otp TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            is_verified BOOLEAN DEFAULT 0
        )
    `);

    // Ensure ai_api_keys table exists
    await db.exec(`
        CREATE TABLE IF NOT EXISTS ai_api_keys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider TEXT NOT NULL,
            api_key TEXT NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Insert sample coupons
    await db.run("INSERT OR IGNORE INTO coupons (code, discount_type, discount_value, min_purchase) VALUES ('WELCOME10', 'percent', 10, 50)");
    await db.run("INSERT OR IGNORE INTO coupons (code, discount_type, discount_value, min_purchase) VALUES ('SAVE20', 'flat', 20, 100)");

    // Seed initial AI API Keys if they don't exist
    const existingKeys = await db.all('SELECT * FROM ai_api_keys');
    if (existingKeys.length === 0) {
        if (process.env.GEMINI_API_KEY) await db.run("INSERT INTO ai_api_keys (provider, api_key, is_active) VALUES (?, ?, ?)", ['Gemini', process.env.GEMINI_API_KEY, 1]);
        if (process.env.GROQ_API_KEY) await db.run("INSERT INTO ai_api_keys (provider, api_key, is_active) VALUES (?, ?, ?)", ['Groq', process.env.GROQ_API_KEY, 1]);
        if (process.env.OPENROUTER_API_KEY) await db.run("INSERT INTO ai_api_keys (provider, api_key, is_active) VALUES (?, ?, ?)", ['OpenRouter', process.env.OPENROUTER_API_KEY, 1]);
    }

})();

// -- Auth Routes --

app.post('/api/auth/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Check if user already exists
    const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) return res.status(400).json({ error: 'Email is already registered' });

    const MathRandom = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    try {
        await db.run(
            'INSERT INTO otp_verifications (email, otp, expires_at, is_verified) VALUES (?, ?, ?, 0) ON CONFLICT(email) DO UPDATE SET otp = excluded.otp, expires_at = excluded.expires_at, is_verified = 0',
            [email, MathRandom, expiresAt.toISOString()]
        );

        const emailSent = await sendOtpEmail(email, MathRandom);
        if (!emailSent) {
            return res.status(500).json({ error: 'Failed to send OTP email. Please ensure your email credentials are setup.' });
        }
        res.json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error('OTP send error:', error);
        res.status(500).json({ error: 'Failed to generate OTP' });
    }
});

app.post('/api/auth/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    try {
        const record = await db.get('SELECT * FROM otp_verifications WHERE email = ?', [email]);
        if (!record) return res.status(400).json({ error: 'No OTP found for this email' });

        if (new Date() > new Date(record.expires_at)) {
            return res.status(400).json({ error: 'OTP has expired' });
        }

        if (record.otp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        await db.run('UPDATE otp_verifications SET is_verified = 1 WHERE email = ?', [email]);
        res.json({ message: 'Email verified successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Verification failed' });
    }
});

app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Ensure email is verified
        const otpRecord = await db.get('SELECT is_verified FROM otp_verifications WHERE email = ?', [email]);
        if (!otpRecord || !otpRecord.is_verified) {
            return res.status(400).json({ error: 'Email must be verified to sign up' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword]);

        // Clean up OTP record
        await db.run('DELETE FROM otp_verifications WHERE email = ?', [email]);

        res.status(201).json({ message: 'User created' });

        // Send welcome email (non-blocking)
        sendWelcomeEmail(email, name).catch(err => console.error('[EMAIL] Welcome email failed:', err.message));
    } catch (error) {
        res.status(400).json({ error: 'Registration failed. Email might already exist.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (user && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
        res.cookie('token', token, { httpOnly: true });
        res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out' });
});

app.get('/api/auth/me', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await db.get('SELECT id, name, email, role FROM users WHERE id = ?', [decoded.id]);
        res.json(user);
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// -- Product Routes --

app.get('/api/products', async (req, res) => {
    try {
        const { search, category, minPrice, maxPrice, comfortLevel, sort, page = 1, limit = 12 } = req.query;
        let whereConditions = 'WHERE 1=1';
        let params = [];

        if (search) {
            whereConditions += ' AND (p.name LIKE ? OR p.description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        if (category && category !== 'All') {
            whereConditions += ' AND c.name = ? COLLATE NOCASE';
            params.push(category);
        }

        if (minPrice) {
            whereConditions += ' AND p.price >= ?';
            params.push(minPrice);
        }

        if (maxPrice) {
            whereConditions += ' AND p.price <= ?';
            params.push(maxPrice);
        }

        if (comfortLevel) {
            whereConditions += ' AND p.comfort_level = ?';
            params.push(comfortLevel);
        }

        if (req.query.sizes) {
            const sizes = req.query.sizes.split(',');
            whereConditions += ` AND p.id IN (SELECT product_id FROM product_variants WHERE size IN (${sizes.map(() => '?').join(',')}))`;
            params.push(...sizes);
        }

        if (req.query.colors) {
            const colors = req.query.colors.split(',');
            whereConditions += ` AND p.id IN (SELECT product_id FROM product_variants WHERE color IN (${colors.map(() => '?').join(',')}))`;
            params.push(...colors);
        }

        // Count for pagination
        const countData = await db.get(`SELECT COUNT(*) as total FROM products p JOIN categories c ON p.category_id = c.id ${whereConditions}`, params);
        const totalCount = countData.total;

        // Sorting
        let orderBy = 'ORDER BY p.id DESC';
        if (sort === 'price_asc') {
            orderBy = 'ORDER BY p.price ASC';
        } else if (sort === 'price_desc') {
            orderBy = 'ORDER BY p.price DESC';
        } else if (sort === 'newest') {
            orderBy = 'ORDER BY p.id DESC';
        }

        // Final query with grouping for ratings
        const offset = (page - 1) * limit;
        const products = await db.all(`
            SELECT p.*, c.name as category_name, 
                   AVG(r.rating) as avg_rating, 
                   COUNT(r.id) as review_count
            FROM products p 
            JOIN categories c ON p.category_id = c.id
            LEFT JOIN reviews r ON p.id = r.product_id
            ${whereConditions}
            GROUP BY p.id
            ${orderBy}
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        res.json({
            products,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: Number(page)
        });
    } catch (error) {
        console.error('GET /api/products ERROR:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/categories', async (req, res) => {
    const categories = await db.all('SELECT * FROM categories');
    res.json(categories);
});

app.get('/api/products/recommended', async (req, res) => {
    const products = await db.all(`
        SELECT p.*, c.name as category_name, 
               AVG(r.rating) as avg_rating, 
               COUNT(r.id) as review_count
        FROM products p 
        JOIN categories c ON p.category_id = c.id 
        LEFT JOIN reviews r ON p.id = r.product_id
        WHERE is_recommended = 1 
        GROUP BY p.id
        LIMIT 4
    `);
    res.json(products);
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await db.get(`
            SELECT p.*, c.name as category_name, 
                   AVG(r.rating) as avg_rating, 
                   COUNT(r.id) as review_count
            FROM products p 
            JOIN categories c ON p.category_id = c.id 
            LEFT JOIN reviews r ON p.id = r.product_id
            WHERE p.id = ?
            GROUP BY p.id
        `, [req.params.id]);

        if (product) {
            const images = await db.all('SELECT * FROM product_images WHERE product_id = ?', [req.params.id]);
            const variants = await db.all('SELECT * FROM product_variants WHERE product_id = ?', [req.params.id]);
            res.json({ ...product, images, variants });
        } else {
            res.status(404).json({ error: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/products/:id/related', async (req, res) => {
    try {
        const product = await db.get('SELECT category_id FROM products WHERE id = ?', [req.params.id]);
        if (!product) return res.status(404).json({ error: 'Product not found' });

        const related = await db.all(`
            SELECT p.*, c.name as category_name, 
                   AVG(r.rating) as avg_rating, 
                   COUNT(r.id) as review_count
            FROM products p 
            JOIN categories c ON p.category_id = c.id 
            LEFT JOIN reviews r ON p.id = r.product_id
            WHERE p.category_id = ? AND p.id != ?
            GROUP BY p.id
            ORDER BY RANDOM()
            LIMIT 4
        `, [product.category_id, req.params.id]);

        res.json(related);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// -- Admin Middleware --
const adminOnly = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        console.log('[AUTH] Admin access denied: No token provided');
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') {
            console.log(`[AUTH] Admin access denied: User ${decoded.email} has role ${decoded.role}`);
            return res.status(403).json({ error: 'Forbidden' });
        }
        req.user = decoded;
        next();
    } catch (error) {
        console.log('[AUTH] Admin access denied: Invalid or expired token');
        res.status(401).json({ error: 'Invalid token' });
    }
};

// -- Order Routes --

app.post('/api/orders', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Login required' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const { items, total_amount, address, city, zip, phone } = req.body;

        // Generate random 10-digit alphanumeric tracking ID
        const trackingId = Math.random().toString(36).substring(2, 12).toUpperCase();

        const result = await db.run(
            'INSERT INTO orders (user_id, total_amount, address, city, zip, phone, tracking_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [decoded.id, total_amount, address, city, zip, phone, trackingId]
        );
        const orderId = result.lastID;

        for (const item of items) {
            // 1. Decrement Stock
            if (item.selectedSize || item.selectedColor) {
                // Try to decrement variant stock first
                const variantUpdate = await db.run(
                    'UPDATE product_variants SET stock = stock - ? WHERE product_id = ? AND size = ? AND color = ? AND stock >= ?',
                    [item.quantity, item.id, item.selectedSize || '', item.selectedColor || '', item.quantity]
                );

                if (variantUpdate.changes === 0) {
                    // Fallback to main product stock if no variant or variant out of stock
                    const productUpdate = await db.run(
                        'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
                        [item.quantity, item.id, item.quantity]
                    );
                    if (productUpdate.changes === 0) {
                        throw new Error(`Insufficient stock for product: ${item.name || item.id}`);
                    }
                }
            } else {
                // No variant selected, decrement main product stock
                const productUpdate = await db.run(
                    'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
                    [item.quantity, item.id, item.quantity]
                );
                if (productUpdate.changes === 0) {
                    throw new Error(`Insufficient stock for product: ${item.name || item.id}`);
                }
            }

            // 2. Record Order Item
            await db.run(
                'INSERT INTO order_items (order_id, product_id, quantity, price, size, color) VALUES (?, ?, ?, ?, ?, ?)',
                [orderId, item.id, item.quantity, item.price, item.selectedSize || '', item.selectedColor || '']
            );
        }

        res.status(201).json({ message: 'Order placed', orderId });

        // Send order confirmation email (non-blocking)
        const user = await db.get('SELECT name, email FROM users WHERE id = ?', [decoded.id]);
        const orderItems = await db.all(`
            SELECT oi.quantity, oi.price, p.name 
            FROM order_items oi JOIN products p ON oi.product_id = p.id 
            WHERE oi.order_id = ?
        `, [orderId]);
        if (user) {
            sendOrderConfirmation(user.email, user.name, {
                orderId,
                trackingId,
                items: orderItems,
                totalAmount: total_amount
            }).catch(err => console.error('[EMAIL] Order confirmation failed:', err.message));
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/orders/create-razorpay-order', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Login required' });
    try {
        const { amount } = req.body;
        const options = {
            amount: Math.round(amount * 100), // amount in the smallest currency unit (paise)
            currency: 'INR',
            receipt: 'receipt_order_' + Date.now(),
        };

        const order = await razorpayInstance.orders.create(options);
        res.json({ id: order.id, currency: order.currency, amount: order.amount });
    } catch (error) {
        console.error('Razorpay Order Create Error:', error);
        res.status(500).json({ error: 'Failed to create Razorpay order' });
    }
});

app.post('/api/orders/verify-razorpay-payment', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Login required' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            items,
            total_amount,
            address,
            city,
            zip,
            phone
        } = req.body;

        // Verify signature
        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generated_signature = hmac.digest('hex');

        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({ error: 'Payment verification failed' });
        }

        // Generate random 10-digit alphanumeric tracking ID
        const trackingId = Math.random().toString(36).substring(2, 12).toUpperCase();

        const result = await db.run(
            'INSERT INTO orders (user_id, total_amount, status, address, city, zip, phone, tracking_id, payment_status, razorpay_order_id, razorpay_payment_id, razorpay_signature) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [decoded.id, total_amount, 'pending', address, city, zip, phone, trackingId, 'Paid', razorpay_order_id, razorpay_payment_id, razorpay_signature]
        );
        const orderId = result.lastID;

        for (const item of items) {
            if (item.selectedSize || item.selectedColor) {
                const variantUpdate = await db.run(
                    'UPDATE product_variants SET stock = stock - ? WHERE product_id = ? AND size = ? AND color = ? AND stock >= ?',
                    [item.quantity, item.id, item.selectedSize || '', item.selectedColor || '', item.quantity]
                );

                if (variantUpdate.changes === 0) {
                    const productUpdate = await db.run(
                        'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
                        [item.quantity, item.id, item.quantity]
                    );
                    if (productUpdate.changes === 0) {
                        throw new Error(`Insufficient stock for product: ${item.name || item.id}`);
                    }
                }
            } else {
                const productUpdate = await db.run(
                    'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
                    [item.quantity, item.id, item.quantity]
                );
                if (productUpdate.changes === 0) {
                    throw new Error(`Insufficient stock for product: ${item.name || item.id}`);
                }
            }

            await db.run(
                'INSERT INTO order_items (order_id, product_id, quantity, price, size, color) VALUES (?, ?, ?, ?, ?, ?)',
                [orderId, item.id, item.quantity, item.price, item.selectedSize || '', item.selectedColor || '']
            );
        }

        res.status(201).json({ message: 'Order placed successfully', orderId });

        // Email logic
        const user = await db.get('SELECT name, email FROM users WHERE id = ?', [decoded.id]);
        const orderItems = await db.all(`
            SELECT oi.quantity, oi.price, p.name 
            FROM order_items oi JOIN products p ON oi.product_id = p.id 
            WHERE oi.order_id = ?
        `, [orderId]);
        if (user) {
            sendOrderConfirmation(user.email, user.name, {
                orderId,
                trackingId,
                items: orderItems,
                totalAmount: total_amount
            }).catch(err => console.error('[EMAIL] Order confirmation failed:', err.message));
        }

    } catch (error) {
        console.error('Razorpay Verify Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/orders/track/:trackingId', async (req, res) => {
    try {
        const order = await db.get('SELECT * FROM orders WHERE tracking_id = ?', [req.params.trackingId.toUpperCase()]);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        const items = await db.all(`
            SELECT oi.*, p.name as product_name, p.image_url 
            FROM order_items oi 
            JOIN products p ON oi.product_id = p.id 
            WHERE oi.order_id = ?
        `, [order.id]);

        res.json({ ...order, items });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/orders/my-orders', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const orders = await db.all('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [decoded.id]);
        res.json(orders);
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// -- User Profile Routes --

app.get('/api/users/profile', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await db.get('SELECT id, name, email, role, phone, address, city, zip FROM users WHERE id = ?', [decoded.id]);
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/users/profile', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const { name, phone, address, city, zip } = req.body;
        await db.run(
            'UPDATE users SET name = ?, phone = ?, address = ?, city = ?, zip = ? WHERE id = ?',
            [name, phone, address, city, zip, decoded.id]
        );
        res.json({ message: 'Profile updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/auth/change-password', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const { currentPassword, newPassword } = req.body;

        const user = await db.get('SELECT * FROM users WHERE id = ?', [decoded.id]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Incorrect current password' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, decoded.id]);

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// -- Wishlist Routes --

app.get('/api/users/wishlist', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const products = await db.all(`
            SELECT p.*, c.name as category_name 
            FROM products p 
            JOIN wishlist w ON p.id = w.product_id 
            JOIN categories c ON p.category_id = c.id
            WHERE w.user_id = ?
        `, [decoded.id]);
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/users/wishlist/toggle', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const { product_id } = req.body;

        const existing = await db.get('SELECT * FROM wishlist WHERE user_id = ? AND product_id = ?', [decoded.id, product_id]);

        if (existing) {
            await db.run('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?', [decoded.id, product_id]);
            res.json({ liked: false });
        } else {
            await db.run('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)', [decoded.id, product_id]);
            res.json({ liked: true });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/users/wishlist/check/:productId', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.json({ liked: false }); // Not logged in
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const { productId } = req.params;
        const existing = await db.get('SELECT * FROM wishlist WHERE user_id = ? AND product_id = ?', [decoded.id, productId]);
        res.json({ liked: !!existing });
    } catch (error) {
        res.json({ liked: false });
    }
});

// -- Review Routes --

app.get('/api/products/:id/reviews', async (req, res) => {
    try {
        const reviews = await db.all(`
            SELECT r.*, u.name as user_name 
            FROM reviews r 
            JOIN users u ON r.user_id = u.id 
            WHERE r.product_id = ? 
            ORDER BY r.created_at DESC
        `, [req.params.id]);
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/products/:id/reviews', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const { rating, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Invalid rating' });
        }

        await db.run(
            'INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
            [req.params.id, decoded.id, rating, comment]
        );
        res.status(201).json({ message: 'Review added' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// -- Admin Routes --

app.get('/api/admin/users', adminOnly, async (req, res) => {
    try {
        const users = await db.all('SELECT id, name, email, password, role, created_at FROM users ORDER BY id ASC');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/orders', adminOnly, async (req, res) => {
    const orders = await db.all('SELECT o.*, u.name as user_name FROM orders o JOIN users u ON o.user_id = u.id ORDER BY created_at DESC');
    res.json(orders);
});

app.get('/api/admin/orders/:id', adminOnly, async (req, res) => {
    try {
        const order = await db.get(`
            SELECT o.*, u.name as user_name, u.email as user_email
            FROM orders o 
            JOIN users u ON o.user_id = u.id 
            WHERE o.id = ?
        `, [req.params.id]);

        if (!order) return res.status(404).json({ error: 'Order not found' });

        const items = await db.all(`
            SELECT oi.*, p.name as product_name, p.image_url
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [req.params.id]);

        res.json({ ...order, items });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/users', adminOnly, async (req, res) => {
    const users = await db.all('SELECT id, name, email, role, created_at FROM users');
    res.json(users);
});

app.delete('/api/admin/users/:id', adminOnly, async (req, res) => {
    try {
        // Optional: delete related records first if foreign keys are enforced without cascade
        await db.run('DELETE FROM wishlist WHERE user_id = ?', [req.params.id]);
        await db.run('DELETE FROM reviews WHERE user_id = ?', [req.params.id]);

        await db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/orders/:id', adminOnly, async (req, res) => {
    const { status } = req.body;
    await db.run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: 'Order updated' });

    // Send order status update email (non-blocking)
    const order = await db.get('SELECT o.*, u.name as user_name, u.email as user_email FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = ?', [req.params.id]);
    if (order && order.user_email) {
        sendOrderStatusUpdate(order.user_email, order.user_name, {
            orderId: order.id,
            trackingId: order.tracking_id,
            status
        }).catch(err => console.error('[EMAIL] Status update email failed:', err.message));
    }
});

app.delete('/api/admin/orders/:id', adminOnly, async (req, res) => {
    await db.run('DELETE FROM order_items WHERE order_id = ?', [req.params.id]);
    await db.run('DELETE FROM orders WHERE id = ?', [req.params.id]);
    res.json({ message: 'Order deleted' });
});

// -- Settings Routes --

app.get('/api/settings', async (req, res) => {
    try {
        const settings = await db.get('SELECT * FROM store_settings WHERE id = 1');
        if (!settings) {
            return res.json({ razorpay_enabled: 1 }); // Default fallback
        }
        res.json({ razorpay_enabled: !!settings.razorpay_enabled });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/settings', adminOnly, async (req, res) => {
    const { razorpay_enabled } = req.body;
    try {
        const enabledInt = razorpay_enabled ? 1 : 0;
        await db.run(
            'UPDATE store_settings SET razorpay_enabled = ? WHERE id = 1',
            [enabledInt]
        );
        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// -- AI Assistant Key Manager Routes --

app.get('/api/admin/ai-keys', adminOnly, async (req, res) => {
    try {
        const keys = await db.all('SELECT * FROM ai_api_keys ORDER BY created_at DESC');
        res.json(keys);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/ai-keys', adminOnly, async (req, res) => {
    const { provider, api_key } = req.body;
    if (!provider || !api_key) return res.status(400).json({ error: 'Provider and API Key are required' });

    try {
        const result = await db.run(
            'INSERT INTO ai_api_keys (provider, api_key, is_active) VALUES (?, ?, ?)',
            [provider, api_key, 1]
        );
        const newKey = await db.get('SELECT * FROM ai_api_keys WHERE id = ?', [result.lastID]);
        res.status(201).json(newKey);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/ai-keys/:id', adminOnly, async (req, res) => {
    try {
        await db.run('DELETE FROM ai_api_keys WHERE id = ?', [req.params.id]);
        res.json({ message: 'Key deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/ai-keys/:id/toggle', adminOnly, async (req, res) => {
    try {
        const key = await db.get('SELECT is_active FROM ai_api_keys WHERE id = ?', [req.params.id]);
        if (!key) return res.status(404).json({ error: 'Key not found' });

        const newStatus = key.is_active ? 0 : 1;
        await db.run('UPDATE ai_api_keys SET is_active = ? WHERE id = ?', [newStatus, req.params.id]);

        res.json({ is_active: newStatus });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/assistant/chat', adminOnly, async (req, res) => {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages array is required' });
    }

    try {
        const activeKeys = await db.all('SELECT * FROM ai_api_keys WHERE is_active = 1 ORDER BY id ASC');
        if (activeKeys.length === 0) {
            return res.status(400).json({ error: 'No active AI API keys available. Please add one in AI Keys settings.' });
        }

        const result = await askAI(messages, activeKeys, db);
        res.json(result);
    } catch (error) {
        console.error('AI Chat Error:', error);
        res.status(500).json({ error: error.message || 'Failed to communicate with AI provider' });
    }
});

// -- Upload Route --
app.post('/api/admin/upload', adminOnly, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
});

app.post('/api/admin/products', adminOnly, async (req, res) => {
    const { name, description, price, category_id, image_url, comfort_level, is_recommended, additional_images, variants } = req.body;
    try {
        const result = await db.run(
            'INSERT INTO products (name, description, price, category_id, image_url, comfort_level, is_recommended) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, description, price, category_id, image_url, comfort_level, is_recommended ? 1 : 0]
        );
        const productId = result.lastID;

        if (additional_images && Array.isArray(additional_images)) {
            for (const imgUrl of additional_images) {
                if (imgUrl.trim()) {
                    await db.run('INSERT INTO product_images (product_id, image_url) VALUES (?, ?)', [productId, imgUrl]);
                }
            }
        }

        if (variants && Array.isArray(variants)) {
            for (const v of variants) {
                const skuValue = v.sku && v.sku.trim() !== '' ? v.sku.trim() : null;
                await db.run(
                    'INSERT INTO product_variants (product_id, size, color, stock, sku) VALUES (?, ?, ?, ?, ?)',
                    [productId, v.size, v.color, v.stock, skuValue]
                );
            }
        }

        res.status(201).json({ message: 'Product added', productId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/products/:id', adminOnly, async (req, res) => {
    const { name, description, price, category_id, image_url, comfort_level, is_recommended, additional_images, variants } = req.body;
    const productId = req.params.id;
    try {
        await db.run(
            'UPDATE products SET name = ?, description = ?, price = ?, category_id = ?, image_url = ?, comfort_level = ?, is_recommended = ? WHERE id = ?',
            [name, description, price, category_id, image_url, comfort_level, is_recommended ? 1 : 0, productId]
        );

        // Update images: simplest way is delete and re-insert
        await db.run('DELETE FROM product_images WHERE product_id = ?', [productId]);
        if (additional_images && Array.isArray(additional_images)) {
            for (const imgUrl of additional_images) {
                if (imgUrl.trim()) {
                    await db.run('INSERT INTO product_images (product_id, image_url) VALUES (?, ?)', [productId, imgUrl]);
                }
            }
        }

        // Update variants: delete and re-insert
        await db.run('DELETE FROM product_variants WHERE product_id = ?', [productId]);
        if (variants && Array.isArray(variants)) {
            for (const v of variants) {
                const skuValue = v.sku && v.sku.trim() !== '' ? v.sku.trim() : null;
                await db.run(
                    'INSERT INTO product_variants (product_id, size, color, stock, sku) VALUES (?, ?, ?, ?, ?)',
                    [productId, v.size, v.color, v.stock, skuValue]
                );
            }
        }

        res.json({ message: 'Product updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/products/:id', adminOnly, async (req, res) => {
    const productId = req.params.id;
    try {
        await db.run('DELETE FROM product_images WHERE product_id = ?', [productId]);
        await db.run('DELETE FROM product_variants WHERE product_id = ?', [productId]);
        await db.run('DELETE FROM products WHERE id = ?', [productId]);
        res.json({ message: 'Product deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// -- Coupon Routes --

app.post('/api/coupons/validate', async (req, res) => {
    const { code, cartTotal } = req.body;
    try {
        const coupon = await db.get('SELECT * FROM coupons WHERE code = ? AND is_active = 1', [code.toUpperCase()]);

        if (!coupon) {
            return res.status(404).json({ error: 'Invalid or expired coupon code' });
        }

        if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
            return res.status(400).json({ error: 'Coupon has expired' });
        }

        if (cartTotal < coupon.min_purchase) {
            return res.status(400).json({ error: `Minimum purchase of $${coupon.min_purchase} required for this coupon` });
        }

        res.json({
            code: coupon.code,
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// -- Admin Stats --

app.get('/api/admin/stats', adminOnly, async (req, res) => {
    try {
        const stats = {};

        // Total stats
        const revenue = await db.get('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status != "cancelled"');
        const orders = await db.get('SELECT COUNT(*) as total FROM orders');
        const users = await db.get('SELECT COUNT(*) as total FROM users WHERE role = "user"');
        const products = await db.get('SELECT COUNT(*) as total FROM products');

        stats.totalRevenue = revenue?.total || 0;
        stats.totalOrders = orders?.total || 0;
        stats.totalUsers = users?.total || 0;
        stats.totalProducts = products?.total || 0;

        // Sales by category - using LEFT JOIN for robustness
        stats.salesByCategory = await db.all(`
            SELECT COALESCE(c.name, 'Uncategorized') as name, SUM(oi.quantity * oi.price) as value
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.status != "cancelled"
            GROUP BY c.id
        `);

        // Recent Orders for the chart
        stats.recentSales = await db.all(`
            SELECT date(created_at) as date, SUM(total_amount) as amount
            FROM orders
            WHERE status != "cancelled"
            GROUP BY date(created_at)
            ORDER BY date DESC
            LIMIT 7
        `);

        res.json(stats);
    } catch (error) {
        console.error('CRITICAL: Admin Stats Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// -- Global Error Handlers (prevent server crashes) --
process.on('unhandledRejection', (reason, promise) => {
    console.error('[GLOBAL] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('[GLOBAL] Uncaught Exception:', error.message);
    // Don't exit — keep the server running
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
