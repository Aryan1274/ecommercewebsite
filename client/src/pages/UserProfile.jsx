import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import './UserProfile.css';

const UserProfile = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [profileData, setProfileData] = useState({
        name: '', phone: '', address: '', city: '', zip: ''
    });
    const [orders, setOrders] = useState([]);
    const [wishlist, setWishlist] = useState([]);
    const [message, setMessage] = useState('');
    const [passwordData, setPasswordData] = useState({
        currentPassword: '', newPassword: '', confirmPassword: ''
    });

    useEffect(() => {
        if (!user) return;
        fetchProfile();
        fetchOrders();
        fetchWishlist();
    }, [user, activeTab]); // Refresh when tab changes to ensure up-to-date data

    const fetchProfile = async () => {
        try {
            const res = await axios.get('/api/users/profile');
            // Populate form with existing data or empty strings
            setProfileData({
                name: res.data.name || '',
                phone: res.data.phone || '',
                address: res.data.address || '',
                city: res.data.city || '',
                zip: res.data.zip || ''
            });
        } catch (error) {
            console.error('Error fetching profile', error);
        }
    };

    const fetchOrders = async () => {
        try {
            const res = await axios.get('/api/orders/my-orders');
            setOrders(res.data);
        } catch (error) {
            console.error('Error fetching orders', error);
        }
    };

    const fetchWishlist = async () => {
        try {
            const res = await axios.get('/api/users/wishlist');
            setWishlist(res.data);
        } catch (error) {
            console.error('Error fetching wishlist', error);
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        try {
            await axios.put('/api/users/profile', profileData);
            setMessage('Profile updated successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage('Failed to update profile.');
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage('New passwords do not match.');
            return;
        }
        try {
            await axios.put('/api/auth/change-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            setMessage('Password changed successfully!');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage(error.response?.data?.error || 'Failed to change password.');
        }
    };

    const handleChange = (e) => {
        setProfileData({ ...profileData, [e.target.name]: e.target.value });
    };

    const handlePasswordInpChange = (e) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    if (!user) return <div className="user-profile-page">Please login to view profile.</div>;

    return (
        <div className="user-profile-page">
            <div className="profile-sidebar">
                <div className="profile-header">
                    <h3>{user.name}</h3>
                    <p>{user.email}</p>
                </div>
                <ul className="profile-menu">
                    <li className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>Profile Settings</li>
                    <li className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>My Orders</li>
                    <li className={activeTab === 'wishlist' ? 'active' : ''} onClick={() => setActiveTab('wishlist')}>My Wishlist</li>
                </ul>
                <button onClick={logout} className="btn btn-logout-sidebar">Logout</button>
            </div>

            <div className="profile-content">
                {message && <div className="profile-message">{message}</div>}

                {activeTab === 'profile' && (
                    <div className="tab-pane">
                        <h2>Profile Settings</h2>
                        <form onSubmit={handleProfileUpdate} className="profile-form">
                            <div className="form-group">
                                <label>Full Name</label>
                                <input name="name" value={profileData.name} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label>Phone</label>
                                <input name="phone" value={profileData.phone} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Address</label>
                                <textarea name="address" value={profileData.address} onChange={handleChange} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>City</label>
                                    <input name="city" value={profileData.city} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label>ZIP Code</label>
                                    <input name="zip" value={profileData.zip} onChange={handleChange} />
                                </div>
                            </div>
                            <button type="submit" className="btn">Save Changes</button>
                        </form>

                        <div className="password-change-section" style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--gray-200)' }}>
                            <h2>Change Password</h2>
                            <form onSubmit={handlePasswordChange} className="profile-form">
                                <div className="form-group">
                                    <label>Current Password</label>
                                    <input type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordInpChange} required />
                                </div>
                                <div className="form-group">
                                    <label>New Password</label>
                                    <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordInpChange} required />
                                </div>
                                <div className="form-group">
                                    <label>Confirm New Password</label>
                                    <input type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordInpChange} required />
                                </div>
                                <button type="submit" className="btn btn-secondary">Update Password</button>
                            </form>
                        </div>
                    </div>
                )}

                {activeTab === 'orders' && (
                    <div className="tab-pane">
                        <h2>My Orders</h2>
                        {orders.length === 0 ? (
                            <p>No orders found.</p>
                        ) : (
                            <div className="orders-list">
                                {orders.map(order => (
                                    <div key={order.id} className="order-card">
                                        <div className="order-header">
                                            <span>Order #{order.id}</span>
                                            <span className={`status-badge status-${order.status}`}>{order.status}</span>
                                        </div>
                                        <div className="order-details">
                                            <p>Date: {new Date(order.created_at).toLocaleDateString()}</p>
                                            <p>Total: <strong>${order.total_amount}</strong></p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'wishlist' && (
                    <div className="tab-pane">
                        <h2>My Wishlist</h2>
                        {wishlist.length === 0 ? (
                            <p>Your wishlist is empty.</p>
                        ) : (
                            <div className="product-grid">
                                {wishlist.map(product => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserProfile;
