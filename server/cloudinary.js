const cloudinary = require('cloudinary').v2;
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const CLOUD_NAME = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
const API_KEY = (process.env.CLOUDINARY_API_KEY || '').trim();
const API_SECRET = (process.env.CLOUDINARY_API_SECRET || '').trim();

// Configure Cloudinary SDK
cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET,
    secure: true
});

/**
 * Upload a file to Cloudinary.
 * Tries SDK upload first, falls back to unsigned REST API upload if SDK fails (e.g. restricted API key).
 * @param {string} filePath - Path to the local file
 * @returns {Promise<string>} - The secure URL of the uploaded image
 */
async function uploadToCloudinary(filePath) {
    // --- Method 1: Try SDK upload (works with root API keys) ---
    try {
        console.log('[CLOUDINARY] Trying SDK upload for:', filePath);
        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: 'auto',
            folder: 'products'
        });
        console.log('[CLOUDINARY] SDK upload success:', result.secure_url);
        return result.secure_url;
    } catch (sdkError) {
        console.warn('[CLOUDINARY] SDK upload failed (possibly restricted API key):', sdkError.message || sdkError.http_code);
    }

    // --- Method 2: Unsigned upload via REST API (works with any key) ---
    try {
        console.log('[CLOUDINARY] Trying unsigned REST API upload...');
        const fileData = fs.readFileSync(filePath);
        const base64Data = `data:image/jpeg;base64,${fileData.toString('base64')}`;

        const formData = new URLSearchParams();
        formData.append('file', base64Data);
        formData.append('upload_preset', 'ml_default'); // Cloudinary's default unsigned preset
        formData.append('folder', 'products');

        const response = await axios.post(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
            formData.toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        console.log('[CLOUDINARY] REST upload success:', response.data.secure_url);
        return response.data.secure_url;
    } catch (restError) {
        const msg = restError.response?.data?.error?.message || restError.message;
        console.error('[CLOUDINARY] REST upload also failed:', msg);
        console.error('[CLOUDINARY] TIP: Go to Cloudinary Settings > Upload > Upload Presets > Enable "ml_default" as Unsigned.');
        throw new Error(`Cloudinary upload failed: ${msg}`);
    }
}

module.exports = { uploadToCloudinary };
