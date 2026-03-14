import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CustomSettings.css';
import { useToast } from '../Toast';

const CustomSettings = () => {
    const [razorpayEnabled, setRazorpayEnabled] = useState(true);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/api/settings');
            setRazorpayEnabled(res.data.razorpay_enabled);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching settings:', error);
            setLoading(false);
        }
    };

    const handleToggle = async () => {
        const newValue = !razorpayEnabled;
        setRazorpayEnabled(newValue); // Optimistic UI update

        try {
            await axios.put('/api/admin/settings', { razorpay_enabled: newValue });
            toast.success(`Razorpay Payment Gateway is now ${newValue ? 'Enabled' : 'Disabled'}`);
        } catch (error) {
            console.error('Error updating settings:', error);
            setRazorpayEnabled(!newValue); // Revert on failure
            toast.error('Failed to update settings');
        }
    };

    if (loading) return <div>Loading settings...</div>;

    return (
        <div className="admin-section custom-settings-section">
            <h2>Custom Settings</h2>

            <div className="setting-card">
                <div className="setting-info">
                    <h3>Razorpay Payment Gateway</h3>
                    <p>Enable or disable the online Razorpay payment UI during checkout. If disabled, orders will default to a standard "Pending" (Cash on Delivery) flow.</p>
                </div>

                <div className="setting-action">
                    <label className="switch">
                        <input
                            type="checkbox"
                            checked={razorpayEnabled}
                            onChange={handleToggle}
                        />
                        <span className="slider round"></span>
                    </label>
                    <span className="status-text">{razorpayEnabled ? 'Active' : 'Inactive'}</span>
                </div>
            </div>
        </div>
    );
};

export default CustomSettings;
