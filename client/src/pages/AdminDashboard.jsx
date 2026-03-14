import React, { useState } from 'react';
import ProductList from '../components/Admin/ProductList';
import ProductForm from '../components/Admin/ProductForm';
import OrderList from '../components/Admin/OrderList';
import UserList from '../components/Admin/UserList';
import CustomSettings from '../components/Admin/CustomSettings';
import AnalyticsDashboard from '../components/Admin/AnalyticsDashboard';
import AiKeyManager from '../components/Admin/AiKeyManager';
import AdminAIAssistant from '../components/Admin/AdminAIAssistant';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('analytics');
    const [editingProduct, setEditingProduct] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleEditProduct = (product) => {
        setEditingProduct(product);
        setIsEditing(true);
    };

    const handleSaveProduct = () => {
        setIsEditing(false);
        setEditingProduct(null);
        setRefreshKey(prev => prev + 1);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditingProduct(null);
    };

    return (
        <div className="admin-dashboard">
            <div className="admin-sidebar">
                <h3>Admin Panel</h3>
                <ul>
                    <li className={activeTab === 'analytics' ? 'active' : ''} onClick={() => setActiveTab('analytics')}>Analytics</li>
                    <li className={activeTab === 'products' ? 'active' : ''} onClick={() => { setActiveTab('products'); setIsEditing(false); }}>Products</li>
                    <li className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>Orders</li>
                    <li className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>Users</li>
                    <li className={activeTab === 'custom' ? 'active' : ''} onClick={() => setActiveTab('custom')}>Custom</li>
                    <li className={activeTab === 'ai_assistant' ? 'active' : ''} onClick={() => setActiveTab('ai_assistant')}>AI Assistant</li>
                    <li className={activeTab === 'ai_keys' ? 'active' : ''} onClick={() => setActiveTab('ai_keys')}>AI Keys</li>
                </ul>
            </div>
            <div className="admin-content">
                {activeTab === 'analytics' && <AnalyticsDashboard />}
                {activeTab === 'products' && (
                    isEditing ? (
                        <ProductForm product={editingProduct} onSave={handleSaveProduct} onCancel={handleCancelEdit} />
                    ) : (
                        <ProductList key={refreshKey} onEdit={handleEditProduct} />
                    )
                )}
                {activeTab === 'orders' && <OrderList />}
                {activeTab === 'users' && <UserList />}
                {activeTab === 'custom' && <CustomSettings />}
                {activeTab === 'ai_keys' && <AiKeyManager />}
                {activeTab === 'ai_assistant' && <AdminAIAssistant />}
            </div>
        </div>
    );
};

export default AdminDashboard;
