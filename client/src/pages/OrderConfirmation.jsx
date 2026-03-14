import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaCheckCircle, FaBox, FaHome } from 'react-icons/fa';
import './OrderConfirmation.css';

const OrderConfirmation = () => {
    const location = useLocation();
    const orderId = location.state?.orderId;

    return (
        <div className="order-confirmation-page">
            <div className="confirmation-card">
                <div className="confirmation-icon">
                    <FaCheckCircle />
                </div>
                <h1>Order Placed Successfully!</h1>
                <p className="confirmation-subtitle">
                    Thank you for shopping with ARVR Fashion
                </p>

                {orderId && (
                    <div className="order-id-box">
                        <span>Order ID</span>
                        <strong>#{orderId}</strong>
                    </div>
                )}

                <div className="confirmation-info">
                    <p>We've received your order and will begin processing it shortly.</p>
                    <p>You can track your order status from your profile.</p>
                </div>

                <div className="confirmation-actions">
                    <Link to="/profile" className="btn">
                        <FaBox style={{ marginRight: '0.5rem' }} />
                        View My Orders
                    </Link>
                    <Link to="/" className="btn btn-secondary">
                        <FaHome style={{ marginRight: '0.5rem' }} />
                        Continue Shopping
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default OrderConfirmation;
