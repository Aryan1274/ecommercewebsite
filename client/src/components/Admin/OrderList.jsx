import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const OrderList = () => {
    const [orders, setOrders] = useState([]);

    const fetchOrders = async () => {
        try {
            const res = await axios.get('/api/admin/orders');
            setOrders(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Error fetching orders:', error);
            setOrders([]);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const updateStatus = async (id, status) => {
        await axios.put(`/api/admin/orders/${id}`, { status });
        fetchOrders();
    };

    const deleteOrder = async (id) => {
        if (window.confirm('Delete this order?')) {
            await axios.delete(`/api/admin/orders/${id}`);
            fetchOrders();
        }
    };

    return (
        <div className="admin-section">
            <h2>Orders</h2>
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>User</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Payment</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {Array.isArray(orders) && orders.map(order => (
                        <tr key={order.id}>
                            <td><Link to={`/admin/orders/${order.id}`} className="order-link">#{order.id}</Link></td>
                            <td>{order.user_name}</td>
                            <td>${order.total_amount}</td>
                            <td>
                                <select
                                    value={order.status}
                                    onChange={(e) => updateStatus(order.id, e.target.value)}
                                    className={`status-select status-${order.status}`}
                                >
                                    <option value="pending">Pending</option>
                                    <option value="shipped">Shipped</option>
                                    <option value="delivered">Delivered</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </td>
                            <td>
                                <div style={{ fontSize: '0.85rem' }}>
                                    <strong>{order.payment_status || 'Pending'}</strong>
                                    {order.razorpay_payment_id && (
                                        <div style={{ color: '#666', fontSize: '0.75rem', marginTop: '2px' }}>
                                            {order.razorpay_payment_id}
                                        </div>
                                    )}
                                </div>
                            </td>
                            <td>{new Date(order.created_at).toLocaleDateString()}</td>
                            <td>
                                <button className="btn btn-sm btn-danger" onClick={() => deleteOrder(order.id)}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default OrderList;
