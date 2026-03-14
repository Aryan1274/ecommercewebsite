import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import axios from 'axios';
import './Checkout.css';

const Checkout = () => {
    const { cart, cartTotal, clearCart } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const [formData, setFormData] = useState({
        address: '',
        city: '',
        zip: '',
        phone: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const [razorpayEnabled, setRazorpayEnabled] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await axios.get('/api/settings');
                setRazorpayEnabled(res.data.razorpay_enabled);
            } catch (error) {
                console.error("Failed to fetch settings, defaulting to Razorpay enabled.");
            }
        };
        fetchSettings();

        // Only load script if we might need it, but to avoid race conditions 
        // with the async fetch, we can just load it anyway.
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [discount, setDiscount] = useState(0);

    const handleApplyCoupon = async () => {
        try {
            const res = await axios.post('/api/coupons/validate', {
                code: couponCode,
                cartTotal: cartTotal
            });
            const coupon = res.data;
            setAppliedCoupon(coupon);

            let d = 0;
            if (coupon.discount_type === 'percent') {
                d = (cartTotal * coupon.discount_value) / 100;
            } else {
                d = coupon.discount_value;
            }
            setDiscount(d);
            toast.success(`Coupon applied! You saved $${d.toFixed(2)}`);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Invalid coupon');
            setAppliedCoupon(null);
            setDiscount(0);
        }
    };

    const finalTotal = cartTotal - discount;

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const orderData = {
                items: cart,
                total_amount: finalTotal,
                coupon_code: appliedCoupon?.code,
                discount_amount: discount,
                ...formData
            };

            if (!razorpayEnabled) {
                // Cash On Delivery / Standard Flow
                const res = await axios.post('/api/orders', orderData);
                clearCart();
                toast.success('Order placed successfully! (COD)');
                navigate('/order-confirmation', { state: { orderId: res.data.orderId } });
                return;
            }

            // 1. Create Razorpay order on backend
            const resInit = await axios.post('/api/orders/create-razorpay-order', { amount: finalTotal });
            const { id: razorpayOrderId, currency, amount } = resInit.data;

            // 2. Open Razorpay checkout modal
            const options = {
                key: "rzp_test_SONVM85SR0Fj0w", // Test key provided by user
                amount: amount,
                currency: currency,
                name: "ArVr Store",
                description: "Order Checkout",
                order_id: razorpayOrderId,
                handler: async function (response) {
                    try {
                        // 3. Verify payment on backend and place order
                        const verifyData = {
                            ...orderData,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        };
                        const resVerify = await axios.post('/api/orders/verify-razorpay-payment', verifyData);

                        clearCart();
                        toast.success('Payment successful & Order placed!');
                        navigate('/order-confirmation', { state: { orderId: resVerify.data.orderId } });
                    } catch (verifyError) {
                        console.error('Verify error:', verifyError);
                        toast.error(verifyError.response?.data?.error || 'Payment verification failed.');
                    }
                },
                prefill: {
                    name: user?.name || '',
                    email: user?.email || '',
                    contact: formData.phone || ''
                },
                theme: {
                    color: "#000000"
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                toast.error('Payment failed: ' + response.error.description);
            });
            rzp.open();

        } catch (error) {
            console.error('Checkout error:', error);
            toast.error('Failed to initiate payment. Please login first or check your cart.');
        }
    };

    if (cart.length === 0) return <h2>Your cart is empty</h2>;

    return (
        <div className="checkout-page">
            <h1 className="page-title">Checkout</h1>
            <div className="checkout-container">
                <form className="checkout-form" onSubmit={handleSubmit}>
                    <h3>Shipping Details</h3>
                    <div className="form-group">
                        <label>Address</label>
                        <textarea name="address" value={formData.address} onChange={handleChange} required />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>City</label>
                            <input type="text" name="city" value={formData.city} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>ZIP Code</label>
                            <input type="text" name="zip" value={formData.zip} onChange={handleChange} required />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Phone</label>
                        <input type="text" name="phone" value={formData.phone} onChange={handleChange} required />
                    </div>

                    <div className="checkout-summary-mobile">
                        <h3>Total: ${cartTotal.toFixed(2)}</h3>
                    </div>

                    <button type="submit" className="btn btn-full">Place Order</button>
                </form>

                <div className="checkout-summary">
                    <h3>Order Summary</h3>
                    {cart.map(item => (
                        <div key={item.id} className="summary-item">
                            <span>{item.name} x {item.quantity}</span>
                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                    ))}

                    <div className="coupon-section">
                        <div className="coupon-input">
                            <input
                                type="text"
                                placeholder="Coupon Code"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value)}
                            />
                            <button type="button" onClick={handleApplyCoupon} className="btn-secondary">Apply</button>
                        </div>
                        {appliedCoupon && (
                            <p className="applied-tag">Coupon applied: {appliedCoupon.code}</p>
                        )}
                    </div>

                    <div className="summary-details">
                        <div className="summary-row">
                            <span>Subtotal</span>
                            <span>${cartTotal.toFixed(2)}</span>
                        </div>
                        {discount > 0 && (
                            <div className="summary-row discount">
                                <span>Discount</span>
                                <span>-${discount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="summary-total">
                            <span>Total</span>
                            <span>${finalTotal.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
