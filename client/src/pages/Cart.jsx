import React from 'react';
import { useCart } from '../context/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import './Cart.css';

const Cart = () => {
    const { cart, removeFromCart, updateQuantity, cartTotal, clearCart } = useCart();
    const navigate = useNavigate();

    React.useEffect(() => {
        document.title = 'Your Cart | ArVr Store';
    }, []);

    if (cart.length === 0) {
        return (
            <div className="empty-cart">
                <h2>Your Cart is Empty</h2>
                <p>Looks like you haven't added anything yet.</p>
                <Link to="/" className="btn">Start Shopping</Link>
            </div>
        );
    }

    return (
        <div className="cart-page">
            <h1 className="page-title">Your Shopping Cart</h1>
            <div className="cart-container">
                <div className="cart-items">
                    {cart.map((item, idx) => (
                        <div key={`${item.id}-${item.selectedSize}-${item.selectedColor}`} className="cart-item">
                            <img src={item.image_url} alt={item.name} className="cart-item-img" />
                            <div className="cart-item-info">
                                <h3>{item.name}</h3>
                                {(item.selectedSize || item.selectedColor) && (
                                    <p className="cart-item-variants">
                                        {item.selectedSize && <span>Size: {item.selectedSize}</span>}
                                        {item.selectedColor && <span>Color: {item.selectedColor}</span>}
                                    </p>
                                )}
                                <p className="cart-item-price">${item.price}</p>
                            </div>
                            <div className="cart-item-actions">
                                <div className="quantity-controls">
                                    <button onClick={() => updateQuantity(item.id, item.quantity - 1, item.selectedSize, item.selectedColor)}>-</button>
                                    <span>{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.id, item.quantity + 1, item.selectedSize, item.selectedColor)}>+</button>
                                </div>
                                <button className="btn-remove" onClick={() => removeFromCart(item.id, item.selectedSize, item.selectedColor)}>Remove</button>
                            </div>
                            <div className="cart-item-total">
                                ${(item.price * item.quantity).toFixed(2)}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="cart-summary">
                    <h3>Order Summary</h3>
                    <div className="summary-row">
                        <span>Subtotal</span>
                        <span>${cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="summary-row">
                        <span>Shipping</span>
                        <span>Free</span>
                    </div>
                    <div className="summary-total">
                        <span>Total</span>
                        <span>${cartTotal.toFixed(2)}</span>
                    </div>
                    <Link to="/checkout" className="btn btn-full">Proceed to Checkout</Link>
                </div>
            </div>
        </div>
    );
};

export default Cart;
