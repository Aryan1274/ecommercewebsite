import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './AdminAIAssistant.css';

const TOOL_LABELS = {
    getProducts: '🔍 Queried Products',
    getProductById: '🔍 Fetched Product',
    createProduct: '➕ Created Product',
    updateProduct: '✏️ Updated Product',
    deleteProduct: '🗑️ Deleted Product',
    getOrders: '📦 Queried Orders',
    getInventory: '📊 Checked Inventory',
    getUsers: '👥 Queried Users',
    applyDiscount: '🏷️ Applied Discount',
    setFeatured: '⭐ Updated Featured Status',
};

const WELCOME_MSG = {
    role: 'assistant',
    content: `Hello! I am your AI Store Manager. I can help you manage your ARVR store using natural language.\n\nTry asking:\n• "How many products are in the Men section?"\n• "Add a Blue T-Shirt for ₹999 in Men category with 50 in stock"\n• "Show me all pending orders"\n• "Apply a 20% discount to product ID 3"\n• "What products have low stock?"`,
    provider: 'System'
};
const AdminAIAssistant = () => {
    const chatContainerRef = useRef(null);
    const fileInputRef = useRef(null);

    const [messages, setMessages] = useState(() => {
        const saved = localStorage.getItem('arvr_ai_chat_history');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { }
        }
        return [WELCOME_MSG];
    });

    const [input, setInput] = useState('');
    const [image, setImage] = useState(null); // Base64 image
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState('Thinking...');

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    };

    // Save history whenever messages change
    useEffect(() => {
        localStorage.setItem('arvr_ai_chat_history', JSON.stringify(messages));
    }, [messages]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = {
            role: 'user',
            content: input.trim(),
            image: image // Send base64 image if present
        };
        // Only send role + content + image history to backend
        const history = [...messages, userMessage]
            .filter(m => m.role !== 'system')
            .map(m => ({ role: m.role, content: m.content, image: m.image }));

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setImage(null);
        setImagePreview(null);
        setLoading(true);
        setLoadingStatus('Thinking...');

        try {
            setLoadingStatus('🔧 Checking if a database action is needed...');
            const response = await axios.post('/api/admin/assistant/chat', {
                messages: history
            }, { withCredentials: true });

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: response.data.text,
                provider: response.data.provider,
                toolUsed: response.data.toolUsed
            }]);
        } catch (error) {
            console.error('Chat Error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I encountered an error: ' + (error.response?.data?.error || error.message),
                isError: true
            }]);
        } finally {
            setLoading(false);
            setLoadingStatus('Thinking...');
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert('Image must be less than 2MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
            // Strip the data:image/jpeg;base64, part
            const base64 = reader.result.split(',')[1];
            setImage(base64);
        };
        reader.readAsDataURL(file);
    };

    const removeImage = () => {
        setImage(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            handleSend(e);
        }
    };

    const formatContent = (content) => {
        // Simple markdown-like rendering for bullet points and line breaks
        return content.split('\n').map((line, i) => (
            <React.Fragment key={i}>
                {line}
                {i < content.split('\n').length - 1 && <br />}
            </React.Fragment>
        ));
    };

    return (
        <div className="admin-section ai-assistant-container">
            <div className="ai-assistant-header">
                <h2>🤖 AI Store Manager</h2>
                <p className="ai-subtitle">Powered by Gemini 2.5 · Ask anything about your store</p>
            </div>
            <div className="chat-window">
                <div className="chat-messages" ref={chatContainerRef}>
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`chat-message ${msg.role}`}>
                            <div
                                className="message-content"
                                style={{ color: msg.isError ? '#e74c3c' : 'inherit' }}
                            >
                                {msg.image && (
                                    <div className="message-image-attachment">
                                        <img src={`data:image/jpeg;base64,${msg.image}`} alt="Attached" />
                                    </div>
                                )}
                                {formatContent(msg.content)}
                            </div>
                            {msg.role === 'assistant' && (
                                <div className="message-meta">
                                    {msg.toolUsed && (
                                        <span className="tool-badge">
                                            {TOOL_LABELS[msg.toolUsed] || `🔧 Used: ${msg.toolUsed}`}
                                        </span>
                                    )}
                                    {msg.provider && msg.provider !== 'System' && (
                                        <span className="message-provider">
                                            Generated by: {msg.provider}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    {loading && (
                        <div className="chat-message assistant">
                            <div className="message-content loading-status">
                                <div className="typing-indicator">
                                    <span></span><span></span><span></span>
                                </div>
                                <span className="loading-label">{loadingStatus}</span>
                            </div>
                        </div>
                    )}
                </div>
                {imagePreview && (
                    <div className="image-preview-area">
                        <img src={imagePreview} alt="Preview" />
                        <button type="button" className="remove-image-btn" onClick={removeImage}>×</button>
                    </div>
                )}
                <form className="chat-input-area" onSubmit={handleSend}>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept="image/*"
                        onChange={handleImageChange}
                    />
                    <button
                        type="button"
                        className="attach-btn"
                        onClick={() => fileInputRef.current.click()}
                        title="Upload product image"
                    >
                        📷
                    </button>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask anything — 'Show pending orders', 'Add a product', 'Check stock levels'..."
                        disabled={loading}
                    />
                    <button type="submit" disabled={loading || (!input.trim() && !image)} className="btn">
                        {loading ? '...' : 'Send'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminAIAssistant;
