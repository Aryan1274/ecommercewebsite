/**
 * Email Service Module
 * Sends emails via Gmail SMTP using an App Password
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * Creates a Nodemailer transporter with standard SMTP
 */
function createTransporter() {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
        return null;
    }

    try {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: user,
                pass: pass
            }
        });
    } catch (error) {
        console.error('[EMAIL] Failed to create transporter:', error.message);
        return null;
    }
}

/**
 * Send an email (generic)
 */
async function sendEmail(to, subject, html) {
    try {
        const transporter = createTransporter();
        if (!transporter) {
            console.log('[EMAIL] Skipping email — check GMAIL_USER and GMAIL_APP_PASSWORD in .env');
            return false;
        }

        const user = process.env.GMAIL_USER;
        const result = await transporter.sendMail({
            from: `"ARVR Store" <${user}>`,
            to,
            subject,
            html
        });

        console.log(`[EMAIL] Sent to ${to}: "${subject}"`);
        return true;
    } catch (error) {
        console.error(`[EMAIL] Failed to send to ${to}:`, error.message);
        return false;
    }
}

/**
 * Welcome email for new signups
 */
async function sendWelcomeEmail(toEmail, userName) {
    const subject = 'Welcome to ARVR Store! 🎉';
    const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fafafa; border-radius: 12px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 30px; text-align: center;">
                <h1 style="color: #e0e0e0; margin: 0; font-size: 28px;">Welcome to <span style="color: #d4a373;">ARVR</span></h1>
            </div>
            <div style="padding: 30px;">
                <h2 style="color: #333; margin-top: 0;">Hi ${userName}! 👋</h2>
                <p style="color: #555; line-height: 1.6;">
                    Thank you for joining ARVR Store. We're excited to have you as part of our community!
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="http://localhost:5173" style="background: #d4a373; color: #fff; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                        Start Shopping →
                    </a>
                </div>
            </div>
        </div>
    `;
    return sendEmail(toEmail, subject, html);
}

/**
 * Order confirmation email
 */
async function sendOrderConfirmation(toEmail, userName, order) {
    const { orderId, trackingId, items, totalAmount } = order;
    const itemRows = items.map(item => `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
    `).join('');

    const subject = `Order Confirmed! #${orderId} 📦`;
    const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fafafa; border-radius: 12px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 30px; text-align: center;">
                <h1 style="color: #e0e0e0; margin: 0; font-size: 28px;">Order Confirmed!</h1>
            </div>
            <div style="padding: 30px;">
                <p>Order ID: #${orderId}</p>
                <p>Tracking ID: <strong>${trackingId}</strong></p>
                <table style="width: 100%; border-collapse: collapse;">
                    ${itemRows}
                </table>
                <h3>Total: $${totalAmount.toFixed(2)}</h3>
            </div>
        </div>
    `;
    return sendEmail(toEmail, subject, html);
}

/**
 * Order status update
 */
async function sendOrderStatusUpdate(toEmail, userName, order) {
    const { orderId, trackingId, status } = order;
    const subject = `Order #${orderId} Status Updated: ${status.toUpperCase()}`;
    const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fafafa; padding: 20px;">
            <h2>Order Update 📦</h2>
            <p>Hi ${userName}, your order #${orderId} is now: <strong>${status}</strong></p>
            <p>Tracking ID: ${trackingId}</p>
        </div>
    `;
    return sendEmail(toEmail, subject, html);
}

/**
 * OTP Verification Email
 */
async function sendOtpEmail(toEmail, otp) {
    const subject = 'Your Verification Code - ARVR Store';
    const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fafafa; border-radius: 12px; padding: 30px; text-align: center;">
            <h2 style="color: #333;">Verify Your Email Address</h2>
            <p style="color: #555; font-size: 16px;">
                Please use the following 6-digit code to verify your email and complete your registration at ARVR Store.
            </p>
            <div style="margin: 30px 0; padding: 20px; background: #eee; border-radius: 8px; display: inline-block;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #d4a373;">${otp}</span>
            </div>
            <p style="color: #999; font-size: 14px;">
                This code will expire in 10 minutes. If you did not request this code, you can safely ignore this email.
            </p>
        </div>
    `;
    return sendEmail(toEmail, subject, html);
}

module.exports = {
    sendWelcomeEmail,
    sendOrderConfirmation,
    sendOrderStatusUpdate,
    sendOtpEmail
};
