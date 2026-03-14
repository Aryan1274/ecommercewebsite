const axios = require('axios');
const { runTool, TOOL_SCHEMA } = require('./aiTools');
const { uploadToCloudinary } = require('./cloudinary');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

/**
 * Main entry point. Receives messages from the chat endpoint,
 * runs the tool-calling orchestration loop, and returns a final response.
 * 
 * @param {Array} messages - Chat history [{role, content}]
 * @param {Array} apiKeys - Active API keys from DB [{provider, api_key}]
 * @param {Object} db - SQLite database connection
 */
async function askAI(messages, apiKeys, db) {
    if (!apiKeys || apiKeys.length === 0) {
        throw new Error('No active AI API keys available.');
    }

    // Sanitize and handle images
    const cleanMessages = [];
    let hostedImageUrl = null;

    for (const msg of messages) {
        const cleanMsg = { role: msg.role, content: msg.content };

        if (msg.image && msg.role === 'user') {
            try {
                // 1. Create temporary file for Cloudinary upload
                const tmpDir = os.tmpdir();
                const fileName = `ai_upload_${crypto.randomBytes(4).toString('hex')}.jpg`;
                const filePath = path.join(tmpDir, fileName);

                // Decode base64 to file
                fs.writeFileSync(filePath, Buffer.from(msg.image, 'base64'));

                // 2. Upload to Cloudinary
                console.log('[AI VISION] Uploading image to Cloudinary...');
                hostedImageUrl = await uploadToCloudinary(filePath);
                console.log(`[AI VISION] Image hosted at: ${hostedImageUrl}`);

                // Clean up temp file
                try { fs.unlinkSync(filePath); } catch(e) {}

                // 3. Attach image to message for AI provider
                cleanMsg.image = msg.image;

                // 4. Update content to nudge AI about the URL
                cleanMsg.content = (cleanMsg.content || '') + `\n\n[SYSTEM NOTE: The attached image has been hosted on Cloudinary at: ${hostedImageUrl}. If you create a product from this image, you MUST use this exact URL for the image_url field.]`;
            } catch (err) {
                console.error('[AI VISION] Cloudinary hosting failed:', err.message);
                // Still attach the image for AI vision analysis, just without hosted URL
                cleanMsg.image = msg.image;
                cleanMsg.content = (cleanMsg.content || '') + `\n\n[SYSTEM NOTE: Image upload to Cloudinary failed. You can still analyze this image but cannot host it. Describe the product but inform the admin that the image could not be uploaded.]`;
            }
        }
        cleanMessages.push(cleanMsg);
    }

    // Build the full conversation with system prompt up front
    const conversation = [
        { role: 'user', content: TOOL_SCHEMA },
        { role: 'assistant', content: 'Understood. I am your AI Store Manager. I have access to all the tools listed and will use them when needed to help manage your ARVR store.' },
        ...cleanMessages
    ];

    let lastError = null;

    // Try each active key until one works
    for (const keyObj of apiKeys) {
        try {
            console.log(`[AI ROUTER] Trying provider: ${keyObj.provider}`);

            // --- STEP 1: Get initial AI response ---
            let aiResponse = await callProvider(conversation, keyObj.provider, keyObj.api_key);

            // --- STEP 2: Check if AI wants to call a tool ---
            const toolCall = detectToolCall(aiResponse.text);

            if (toolCall && db) {
                console.log(`[AI TOOLS] Tool call detected: ${toolCall.tool}`, toolCall.args);

                // --- STEP 3: Execute the tool ---
                const toolResult = await runTool(toolCall.tool, toolCall.args, db);
                console.log(`[AI TOOLS] Tool result:`, JSON.stringify(toolResult).substring(0, 200));

                // --- STEP 4: Feed result back to AI for a human-readable response ---
                const followUpConversation = [
                    ...conversation,
                    { role: 'assistant', content: aiResponse.text },
                    {
                        role: 'user',
                        content: `Tool "${toolCall.tool}" returned the following result:\n${JSON.stringify(toolResult, null, 2)}\n\nPlease summarize this result in a friendly, clear way for the admin. Do NOT output JSON.`
                    }
                ];

                const finalResponse = await callProvider(followUpConversation, keyObj.provider, keyObj.api_key);

                return {
                    provider: keyObj.provider,
                    text: finalResponse.text,
                    toolUsed: toolCall.tool
                };
            }

            // No tool call — return the direct response
            console.log(`[AI ROUTER] Success using ${keyObj.provider}`);
            return {
                provider: keyObj.provider,
                text: aiResponse.text,
                toolUsed: null
            };

        } catch (error) {
            const errorData = error.response?.data;
            const errorMsg = errorData ? JSON.stringify(errorData) : error.message;
            console.error(`[AI ROUTER] Failed with ${keyObj.provider}: ${errorMsg}`);

            // Check for specific quota/billing errors — skip this provider, don't crash
            const isQuotaError = errorMsg.includes('insufficient_quota') ||
                                 errorMsg.includes('billing') ||
                                 errorMsg.includes('exceeded') ||
                                 errorMsg.includes('rate_limit') ||
                                 error.response?.status === 429 ||
                                 error.response?.status === 402;

            if (isQuotaError) {
                console.warn(`[AI ROUTER] ${keyObj.provider} has quota/billing issues, skipping to next...`);
            }

            lastError = new Error(`${keyObj.provider}: ${errorMsg}`);
        }
    }

    throw lastError || new Error('All active AI providers failed.');
}

/**
 * Detect if the AI response is a JSON tool call.
 * Returns { tool, args } or null.
 */
function detectToolCall(text) {
    if (!text) return null;

    // Look for anything that looks like a JSON block: { ... }
    // We search for the first '{' and the last '}'
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        const potentialJson = text.substring(startIdx, endIdx + 1);
        try {
            const parsed = JSON.parse(potentialJson);
            if (parsed.tool && typeof parsed.tool === 'string') {
                return { tool: parsed.tool, args: parsed.args || {} };
            }
        } catch (e) {
            // Not valid JSON, continue to search if needed or just return null
        }
    }
    return null;
}

/**
 * Route to the correct provider function.
 */
async function callProvider(messages, provider, apiKey) {
    const p = provider.toLowerCase();
    if (p === 'gemini' || p === 'google gemini') return await callGemini(messages, apiKey);
    if (p === 'groq') return await callGroq(messages, apiKey);
    if (p === 'openrouter') return await callOpenRouter(messages, apiKey);
    if (p === 'openai') return await callOpenAI(messages, apiKey);
    if (p === 'anthropic' || p === 'claude' || p === 'other') return await callAnthropic(messages, apiKey);
    throw new Error(`Unsupported provider: ${provider}`);
}

// ----------------- Provider Implementations -----------------

async function callGroq(messages, apiKey) {
    const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
            model: 'llama-3.1-8b-instant',
            messages: messages,
            temperature: 0.3,  // Lower temp for more consistent tool call JSON
            max_tokens: 2048
        },
        {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        }
    );
    return { text: response.data.choices[0].message.content };
}

async function callOpenRouter(messages, apiKey) {
    // Format messages: if a message has an image, use multi-part content (OpenAI vision format)
    const formattedMessages = messages.map(msg => {
        if (msg.image && msg.role === 'user') {
            return {
                role: msg.role,
                content: [
                    { type: 'text', text: msg.content || 'Describe this image.' },
                    {
                        type: 'image_url',
                        image_url: {
                            url: `data:image/jpeg;base64,${msg.image}`
                        }
                    }
                ]
            };
        }
        return { role: msg.role, content: msg.content };
    });

    const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
            model: 'google/gemma-3-27b-it:free',  // Verified free vision-capable model
            messages: formattedMessages,
            temperature: 0.3
        },
        {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'http://localhost:5173',
                'X-Title': 'ARVR Store Admin',
                'Content-Type': 'application/json'
            }
        }
    );
    return { text: response.data.choices[0].message.content };
}

async function callOpenAI(messages, apiKey) {
    const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
            model: 'gpt-3.5-turbo',
            messages: messages,
            temperature: 0.3
        },
        {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        }
    );
    return { text: response.data.choices[0].message.content };
}

async function callGemini(messages, apiKey) {
    // Convert messages to Gemini format
    let systemText = '';
    const geminiContents = [];

    for (const msg of messages) {
        if (msg.role === 'system') {
            systemText += msg.content + '\n\n';
        } else {
            const role = msg.role === 'assistant' ? 'model' : 'user';
            const textContent = (role === 'user' && geminiContents.length === 0)
                ? systemText + msg.content
                : msg.content;

            if (geminiContents.length > 0 && geminiContents[geminiContents.length - 1].role === role) {
                geminiContents[geminiContents.length - 1].parts.push({ text: msg.content });
                if (msg.image) {
                    geminiContents[geminiContents.length - 1].parts.push({
                        inline_data: {
                            mime_type: 'image/jpeg',
                            data: msg.image
                        }
                    });
                }
            } else {
                const parts = [{ text: textContent }];
                if (msg.image) {
                    parts.push({
                        inline_data: {
                            mime_type: 'image/jpeg',
                            data: msg.image
                        }
                    });
                }
                geminiContents.push({ role, parts });
            }
        }
    }

    const requestBody = {
        contents: geminiContents,
        generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
        }
    };

    const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        requestBody,
        { headers: { 'Content-Type': 'application/json' } }
    );

    const text = response.data.candidates[0].content.parts[0].text;
    return { text };
}

async function callAnthropic(messages, apiKey) {
    // Anthropic requires system prompt at the top level
    const systemMessage = messages.find(m => m.role === 'system');
    const cleanMessages = messages.filter(m => m.role !== 'system').map(m => {
        if (!m.image) return m;
        return {
            role: m.role,
            content: [
                { type: 'text', text: m.content || 'Analyze this image.' },
                {
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: 'image/jpeg',
                        data: m.image
                    }
                }
            ]
        };
    });

    const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
            model: 'claude-3-5-sonnet-20240620',
            max_tokens: 2048,
            temperature: 0.3,
            system: systemMessage ? systemMessage.content : undefined,
            messages: cleanMessages
        },
        {
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json'
            }
        }
    );

    return { text: response.data.content[0].text };
}

module.exports = { askAI };
