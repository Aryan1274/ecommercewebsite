/**
 * aiTools.js
 * 
 * These are the "tools" the AI can call to interact with the store database.
 * Each function receives the db connection and arguments from the AI,
 * performs the query, and returns a result the AI can read and summarize.
 */

async function getProducts(db, { category, search, limit = 20 } = {}) {
    let query = `
        SELECT p.id, p.name, p.price, c.name as category, p.description, p.stock, p.is_recommended as is_featured
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE 1=1
    `;
    const params = [];

    if (category) {
        query += ` AND LOWER(c.name) = LOWER(?)`;
        params.push(category);
    }
    if (search) {
        query += ` AND (LOWER(p.name) LIKE LOWER(?) OR LOWER(p.description) LIKE LOWER(?))`;
        params.push(`%${search}%`, `%${search}%`);
    }
    query += ` ORDER BY p.id DESC LIMIT ?`;
    params.push(limit);

    const products = await db.all(query, params);
    return { count: products.length, products };
}

async function getProductById(db, { id }) {
    const product = await db.get(`
        SELECT p.id, p.name, p.price, c.name as category, p.description, p.stock, p.is_recommended as is_featured
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = ?
    `, [id]);
    if (!product) return { error: `No product found with ID ${id}` };
    return product;
}

async function createProduct(db, { name, price, category, description, image_url, stock = 0, is_featured = 0 }) {
    if (!name || !price || !category) {
        return { error: 'name, price, and category are required fields.' };
    }
    const cat = await db.get('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)', [category]);
    if (!cat) return { error: `Category '${category}' not found. Please use Men, Women, or Kids.` };

    const result = await db.run(
        `INSERT INTO products (name, price, category_id, description, image_url, stock, is_recommended)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, price, cat.id, description || '', image_url || '', stock, is_featured]
    );
    return { success: true, message: `Product "${name}" created.`, productId: result.lastID };
}

async function updateProduct(db, { id, fields }) {
    if (!id || !fields || Object.keys(fields).length === 0) {
        return { error: 'id and at least one field to update are required.' };
    }

    const updates = [];
    const values = [];

    for (const [key, val] of Object.entries(fields)) {
        if (key === 'category') {
            const cat = await db.get('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)', [val]);
            if (!cat) return { error: `Category '${val}' not found.` };
            updates.push(`category_id = ?`);
            values.push(cat.id);
        } else if (key === 'is_featured') {
            updates.push(`is_recommended = ?`);
            values.push(val);
        } else if (['name', 'price', 'description', 'image_url', 'stock'].includes(key)) {
            updates.push(`${key} = ?`);
            values.push(val);
        }
    }

    if (updates.length === 0) return { error: 'No valid fields to update.' };
    values.push(id);

    await db.run(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, values);
    return { success: true, message: `Product ID ${id} updated successfully.` };
}

async function deleteProduct(db, { id }) {
    if (!id) return { error: 'id is required.' };
    const product = await db.get('SELECT name FROM products WHERE id = ?', [id]);
    if (!product) return { error: `No product found with ID ${id}` };
    await db.run('DELETE FROM products WHERE id = ?', [id]);
    return { success: true, message: `Product "${product.name}" deleted.` };
}

async function getOrders(db, { status, limit = 20 } = {}) {
    let query = `
        SELECT o.id, o.total_amount as total_price, o.status, o.payment_status,
               o.created_at, u.name as customer_name, u.email as customer_email
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE 1=1
    `;
    const params = [];
    if (status) {
        query += ` AND LOWER(o.status) = LOWER(?)`;
        params.push(status);
    }
    query += ` ORDER BY o.created_at DESC LIMIT ?`;
    params.push(limit);

    const orders = await db.all(query, params);
    const total = await db.get('SELECT COUNT(*) as count FROM orders' + (status ? ' WHERE LOWER(status) = LOWER(?)' : ''), status ? [status] : []);
    return { count: total.count, shown: orders.length, orders };
}

const { sendOrderStatusUpdate } = require('./emailService');

async function updateOrderStatus(db, { id, status }) {
    if (!id || !status) return { error: 'id and status are required.' };
    
    // Validate status
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status.toLowerCase())) {
        return { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` };
    }

    const ids = Array.isArray(id) ? id : [id];
    if (ids.length === 0) return { error: 'No order IDs provided.' };

    const placeholders = ids.map(() => '?').join(',');
    
    // Get emails and user details before updating so we can send emails
    const ordersToUpdate = await db.all(`
        SELECT o.id as orderId, u.email, u.name as userName 
        FROM orders o 
        JOIN users u ON o.user_id = u.id 
        WHERE o.id IN (${placeholders})
    `, ids);

    // Update the database
    await db.run(`UPDATE orders SET status = ? WHERE id IN (${placeholders})`, [status.toLowerCase(), ...ids]);
    
    // Send emails in background
    for (const order of ordersToUpdate) {
        if (order.email) {
            sendOrderStatusUpdate(order.email, order.userName, {
                orderId: order.orderId,
                trackingId: 'N/A', // Set trackingId to N/A since it doesn't exist in DB
                status: status.toLowerCase()
            }).catch(err => console.error('Failed to send AI status update email:', err));
        }
    }

    return { success: true, message: `Status updated to '${status.toLowerCase()}' for order IDs: ${ids.join(', ')}. Notification emails triggered.` };
}

async function updatePaymentStatus(db, { id, payment_status }) {
    if (!id || !payment_status) return { error: 'id and payment_status are required.' };
    
    const validStatuses = ['pending', 'paid', 'failed', 'refunded'];
    if (!validStatuses.includes(payment_status.toLowerCase())) {
        return { error: `Invalid payment status. Must be one of: ${validStatuses.join(', ')}` };
    }

    const ids = Array.isArray(id) ? id : [id];
    if (ids.length === 0) return { error: 'No order IDs provided.' };

    const placeholders = ids.map(() => '?').join(',');
    await db.run(`UPDATE orders SET payment_status = ? WHERE id IN (${placeholders})`, [payment_status.toLowerCase(), ...ids]);
    
    return { success: true, message: `Payment status updated to '${payment_status.toLowerCase()}' for order IDs: ${ids.join(', ')}.` };
}

async function getInventory(db, { } = {}) {
    const summary = await db.all(`
        SELECT COALESCE(c.name, 'Uncategorized') as category, COUNT(p.id) as product_count, SUM(p.stock) as total_stock
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        GROUP BY c.id
    `);
    const lowStock = await db.all(`
        SELECT p.id, p.name, c.name as category, p.stock 
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id 
        WHERE p.stock <= 5 
        ORDER BY p.stock ASC LIMIT 10
    `);
    return { categorySummary: summary, lowStockProducts: lowStock };
}

async function getUsers(db, { limit = 20 } = {}) {
    const users = await db.all(
        `SELECT id, name, email, created_at FROM users ORDER BY created_at DESC LIMIT ?`,
        [limit]
    );
    const total = await db.get('SELECT COUNT(*) as count FROM users');
    return { totalUsers: total.count, shownUsers: users.length, users };
}

async function applyDiscount(db, { id, percent }) {
    if (!id || !percent) return { error: 'id and percent are required.' };
    const product = await db.get('SELECT id, name, price FROM products WHERE id = ?', [id]);
    if (!product) return { error: `No product found with ID ${id}` };
    const newPrice = parseFloat((product.price * (1 - percent / 100)).toFixed(2));
    await db.run('UPDATE products SET price = ? WHERE id = ?', [newPrice, id]);
    return { success: true, message: `Applied ${percent}% discount to "${product.name}". Price is now ${newPrice}.` };
}

async function setFeatured(db, { id, featured }) {
    if (id === undefined) return { error: 'id is required.' };
    const val = featured ? 1 : 0;
    const result = await db.run('UPDATE products SET is_recommended = ? WHERE id = ?', [val, id]);
    if (result.changes === 0) return { error: `No product found with ID ${id}` };
    return { success: true, message: `Product ID ${id} is now ${featured ? 'featured' : 'unfeatured'}.` };
}

// Tool registry — maps AI tool names to functions
const TOOLS = {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    getOrders,
    updateOrderStatus,
    updatePaymentStatus,
    getInventory,
    getUsers,
    applyDiscount,
    setFeatured
};

async function runTool(toolName, args, db) {
    const fn = TOOLS[toolName];
    if (!fn) return { error: `Unknown tool: ${toolName}` };
    try {
        return await fn(db, args || {});
    } catch (e) {
        return { error: `Tool execution error: ${e.message}` };
    }
}

// Schema sent to the AI so it knows what tools are available
const TOOL_SCHEMA = `
You are an AI Store Manager for the ARVR e-commerce platform. 
You have access to the following tools to manage the store. 
When the user asks you to do something that requires database access, respond ONLY with a JSON object in this exact format (no other text, no markdown):
{"tool": "toolName", "args": {"arg1": "value1"}}

Available tools:
- getProducts(category?, search?, limit?) — List products. category can be "Men", "Women", or "Kids"
- getProductById(id) — Get a single product's details
- createProduct(name, price, category, description?, image_url?, stock?) — Add a new product. If an image is provided in the chat, use the hosted Cloudinary URL for image_url.
- updateProduct(id, fields) — Update product fields. fields is an object like {"price": 999, "stock": 50}
- deleteProduct(id) — Delete a product by ID
- getOrders(status?, limit?) — List orders. status can be "pending", "processing", "shipped", "delivered", "cancelled"
- updateOrderStatus(id, status) — Update an order's fulfillment status. id can be a single order ID or an array of IDs [1, 2, 3].
- updatePaymentStatus(id, payment_status) — Update an order's payment status (e.g., "paid", "refunded"). id can be an array.
- getInventory() — Get stock summary by category and low-stock alerts
- getUsers(limit?) — List registered users
- applyDiscount(id, percent) — Apply a percentage discount to a product's price
- setFeatured(id, featured) — Set featured=true or featured=false for a product

When the user asks a regular question (not requiring DB access), answer normally without tool calls.
After a tool runs and returns results, summarize them in a friendly, helpful way.
Always be conversational. If a user says "add", "create", "delete", "show", "how many", "list", think about whether a tool should be called.
`;

module.exports = { runTool, TOOL_SCHEMA };
