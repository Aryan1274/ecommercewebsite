import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaDollarSign, FaShoppingCart, FaUsers, FaBox } from 'react-icons/fa';
import './AnalyticsDashboard.css';

const AnalyticsDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axios.get('/api/admin/stats');
                setStats(res.data);
            } catch (error) {
                console.error('Error fetching admin stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="admin-loading">Loading Analytics...</div>;
    if (!stats) return (
        <div className="admin-error">
            <h3>Failed to load stats</h3>
            <p>Please ensure you are logged in as an admin and the database is active.</p>
        </div>
    );

    const salesByCategory = stats.salesByCategory || [];
    const recentSales = stats.recentSales || [];
    const maxSales = Math.max(...salesByCategory.map(c => c.value), 1);

    return (
        <div className="analytics-dashboard">
            <h2 className="admin-title">Business Overview</h2>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon revenue"><FaDollarSign /></div>
                    <div className="stat-info">
                        <h3>Total Revenue</h3>
                        <p className="stat-value">${stats.totalRevenue.toFixed(2)}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orders"><FaShoppingCart /></div>
                    <div className="stat-info">
                        <h3>Total Orders</h3>
                        <p className="stat-value">{stats.totalOrders}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon users"><FaUsers /></div>
                    <div className="stat-info">
                        <h3>Customers</h3>
                        <p className="stat-value">{stats.totalUsers}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon products"><FaBox /></div>
                    <div className="stat-info">
                        <h3>Products</h3>
                        <p className="stat-value">{stats.totalProducts}</p>
                    </div>
                </div>
            </div>

            <div className="analytics-grid">
                <div className="analytics-box">
                    <h3>Sales by Category</h3>
                    <div className="category-chart">
                        {salesByCategory.length === 0 ? (
                            <p className="no-data">No sales data for categories yet.</p>
                        ) : (
                            salesByCategory.map(cat => (
                                <div key={cat.name} className="chart-row">
                                    <span className="chart-label">{cat.name}</span>
                                    <div className="chart-bar-container">
                                        <div
                                            className="chart-bar"
                                            style={{ width: `${(cat.value / maxSales) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="chart-value">${cat.value.toFixed(2)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="analytics-box">
                    <h3>Recent Sales (Daily)</h3>
                    <div className="recent-sales-list">
                        {recentSales.length === 0 ? (
                            <p className="no-data">No daily sales data yet.</p>
                        ) : (
                            recentSales.map((sale, index) => (
                                <div key={index} className="sale-row">
                                    <span className="sale-date">{new Date(sale.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                    <span className="sale-amount">${sale.amount.toFixed(2)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
