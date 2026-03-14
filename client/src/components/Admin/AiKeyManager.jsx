import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AiKeyManager = () => {
    const [keys, setKeys] = useState([]);
    const [provider, setProvider] = useState('Gemini');
    const [apiKey, setApiKey] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchKeys = async () => {
        try {
            const res = await axios.get('/api/admin/ai-keys');
            setKeys(res.data);
        } catch (err) {
            console.error('Failed to fetch AI keys', err);
        }
    };

    useEffect(() => {
        fetchKeys();
    }, []);

    const handleAddKey = async (e) => {
        e.preventDefault();
        setError('');
        if (!apiKey.trim()) {
            setError('API Key is required');
            return;
        }
        setLoading(true);
        try {
            await axios.post('/api/admin/ai-keys', { provider, api_key: apiKey.trim() });
            setApiKey('');
            fetchKeys();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add key');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this key?')) return;
        try {
            await axios.delete(`/api/admin/ai-keys/${id}`);
            fetchKeys();
        } catch (err) {
            alert('Failed to delete key');
        }
    };

    const handleToggle = async (id) => {
        try {
            await axios.put(`/api/admin/ai-keys/${id}/toggle`);
            fetchKeys();
        } catch (err) {
            alert('Failed to toggle key status');
        }
    };

    return (
        <div className="admin-section">
            <h2>AI API Key Manager</h2>
            <p style={{ color: '#555', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                Manage your LLM (Large Language Model) API keys here. The AI Assistant will automatically round-robin through <strong>active</strong> keys to balance loads and maximize free tier usage.
            </p>

            <div className="add-key-form" style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>Add New Key</h3>
                {error && <p className="error-message">{error}</p>}
                <form onSubmit={handleAddKey} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ flex: '1', margin: 0 }}>
                        <label>Provider</label>
                        <select value={provider} onChange={(e) => setProvider(e.target.value)} required>
                            <option value="Gemini">Google Gemini</option>
                            <option value="Groq">Groq</option>
                            <option value="OpenAI">OpenAI</option>
                            <option value="Anthropic">Anthropic</option>
                            <option value="OpenRouter">OpenRouter</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ flex: '2', margin: 0 }}>
                        <label>API Key</label>
                        <input
                            type="text"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="e.g. sk-..."
                            required
                            disabled={loading}
                        />
                    </div>
                    <button type="submit" className="btn" disabled={loading} style={{ height: '42px', padding: '0 1.5rem' }}>
                        {loading ? 'Adding...' : 'Add Key'}
                    </button>
                </form>
            </div>

            <table className="admin-table">
                <thead>
                    <tr>
                        <th>Provider</th>
                        <th>API Key (Masked)</th>
                        <th>Added On</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {keys.length === 0 ? (
                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No API keys added yet.</td></tr>
                    ) : (
                        keys.map((key) => (
                            <tr key={key.id}>
                                <td><strong>{key.provider}</strong></td>
                                <td>
                                    <span style={{ fontFamily: 'monospace', opacity: 0.8 }}>
                                        {key.api_key.substring(0, 6)}...{key.api_key.substring(key.api_key.length - 4)}
                                    </span>
                                </td>
                                <td>{new Date(key.created_at).toLocaleDateString()}</td>
                                <td>
                                    <span style={{
                                        padding: '4px 8px',
                                        borderRadius: '12px',
                                        fontSize: '0.8rem',
                                        fontWeight: 'bold',
                                        background: key.is_active ? '#e6f4ea' : '#fce8e6',
                                        color: key.is_active ? '#1e8e3e' : '#d93025'
                                    }}>
                                        {key.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            className="btn btn-sm"
                                            style={{ background: key.is_active ? '#6c757d' : '#28a745', padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
                                            onClick={() => handleToggle(key.id)}
                                        >
                                            {key.is_active ? 'Disable' : 'Enable'}
                                        </button>
                                        <button
                                            className="btn btn-sm btn-danger"
                                            onClick={() => handleDelete(key.id)}
                                            style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default AiKeyManager;
