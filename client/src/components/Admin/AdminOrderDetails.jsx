import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './AdminOrderDetails.css';

const AdminOrderDetails = () => {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const res = await axios.get(`/api/admin/orders/${id}`);
                setOrder(res.data || null);
            } catch (error) {
                console.error('Error fetching order details', error);
                setOrder(null);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [id]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="admin-page">Loading...</div>;
    if (!order) return <div className="admin-page">Order not found</div>;

    return (
        <div className="admin-page admin-order-details">
            <div className="no-print">
                <Link to="/admin" className="back-link">← Back to Dashboard</Link>
                <div className="header-actions">
                    <h1>Order Details: #{order.id}</h1>
                    <button className="btn btn-print" onClick={handlePrint}>Generate Invoice</button>
                </div>
            </div>

            {/* Printable Invoice Section */}
            <div className="invoice-container">
                <div className="invoice-header">
                    <div className="company-info">
                        <h2>ARVR Fashion</h2>
                        <p>123 Fashion Street, Design City</p>
                        <p>support@arvr.com</p>
                    </div>
                    <div className="invoice-meta">
                        <h1>INVOICE</h1>
                        <p><strong>Order ID:</strong> #{order.id}</p>
                        <p><strong>Tracking ID:</strong> {order.tracking_id || 'N/A'}</p>
                        <p><strong>Date:</strong> {new Date(order.created_at).toLocaleDateString()}</p>
                        <p><strong>Status:</strong> {order.status}</p>
                    </div>
                </div>

                <div className="invoice-billing">
                    <h3>Bill To:</h3>
                    <p><strong>{order.user_name}</strong></p>
                    <p>{order.address}</p>
                    <p>{order.city}, {order.zip}</p>
                    <p>Phone: {order.phone}</p>
                    <p>Email: {order.user_email}</p>
                </div>

                <table className="invoice-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Unit Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order?.items && Array.isArray(order.items) && order.items.map((item, index) => (
                            <tr key={index}>
                                <td>
                                    {item.product_name}
                                    <div className="item-meta">ID: {item.product_id}</div>
                                </td>
                                <td>{item.quantity}</td>
                                <td>${item.price.toFixed(2)}</td>
                                <td>${(item.price * item.quantity).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan="3" className="text-right"><strong>Total Amount:</strong></td>
                            <td><strong>${order.total_amount.toFixed(2)}</strong></td>
                        </tr>
                    </tfoot>
                </table>

                <div className="invoice-footer">
                    <p>Thank you for your business!</p>
                    <p>For return inquiries, please contact support within 30 days.</p>
                </div>
            </div>
        </div>
    );
};

export default AdminOrderDetails;
