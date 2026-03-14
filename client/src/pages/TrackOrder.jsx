import React, { useState } from 'react';
import axios from 'axios';
import { useToast } from '../components/Toast';
import './TrackOrder.css';

const TrackOrder = () => {
    const [trackingId, setTrackingId] = useState('');
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    const handleTrack = async (e) => {
        e.preventDefault();
        if (!trackingId) return;

        setLoading(true);
        try {
            const res = await axios.get(`/api/orders/track/${trackingId}`);
            setOrder(res.data);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Order not found');
            setOrder(null);
        } finally {
            setLoading(false);
        }
    };

    const getStatusStep = (status) => {
        const steps = ['pending', 'processing', 'shipped', 'delivered'];
        return steps.indexOf(status.toLowerCase());
    };

    return (
        <div className="track-order-page">
            <h1 className="page-title">Track Your Order</h1>
            <div className="track-container">
                <form className="track-form" onSubmit={handleTrack}>
                    <input
                        type="text"
                        placeholder="Enter Tracking ID (e.g. AB12345678)"
                        value={trackingId}
                        onChange={(e) => setTrackingId(e.target.value)}
                        required
                    />
                    <button type="submit" className="btn" disabled={loading}>
                        {loading ? 'Searching...' : 'Track Order'}
                    </button>
                </form>

                {order && (
                    <div className="order-status-card">
                        <div className="order-header">
                            <div>
                                <h3>Order #{order.id}</h3>
                                <p>Tracking ID: <span className="tracking-id-label">{order.tracking_id}</span></p>
                            </div>
                            <div className={`status-badge ${order.status.toLowerCase()}`}>
                                {order.status}
                            </div>
                        </div>

                        <div className="status-progress">
                            {['Placed', 'Processing', 'Shipped', 'Delivered'].map((step, index) => (
                                <div key={step} className={`progress-step ${index <= getStatusStep(order.status) ? 'active' : ''}`}>
                                    <div className="step-dot"></div>
                                    <span className="step-label">{step}</span>
                                </div>
                            ))}
                        </div>

                        <div className="order-details-grid">
                            <div className="details-box">
                                <h3>Shipping Address</h3>
                                <p>{order.address}</p>
                                <p>{order.city}, {order.zip}</p>
                                <p>Phone: {order.phone}</p>
                            </div>
                            <div className="details-box">
                                <h3>Order Summary</h3>
                                <div className="track-items">
                                    {order.items.map(item => (
                                        <div key={item.id} className="track-item">
                                            <span>{item.product_name} x {item.quantity}</span>
                                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="track-total">
                                    <span>Total Amount</span>
                                    <span>${order.total_amount.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrackOrder;
