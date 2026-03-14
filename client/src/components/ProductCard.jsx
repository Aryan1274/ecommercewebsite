import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { FaHeart, FaRegHeart, FaStar } from 'react-icons/fa';
import axios from 'axios';
import './ProductCard.css';

const ProductCard = ({ product }) => {
    const { addToCart } = useCart();
    const toast = useToast();
    const { user } = useAuth();
    const [isLiked, setIsLiked] = useState(false);

    useEffect(() => {
        if (user) {
            axios.get(`/api/users/wishlist/check/${product.id}`)
                .then(res => setIsLiked(res.data.liked))
                .catch(err => console.error('Error checking wishlist', err));
        }
    }, [user, product.id]);

    const toggleLike = async () => {
        if (!user) {
            toast.info('Please login to add to wishlist');
            return;
        }
        try {
            const res = await axios.post('/api/users/wishlist/toggle', { product_id: product.id });
            setIsLiked(res.data.liked);
        } catch (error) {
            console.error('Error toggling wishlist', error);
        }
    };

    return (
        <div className="product-card">
            <div className="product-image-container">
                <img
                    src={product.image_url || 'https://via.placeholder.com/300'}
                    alt={product.name}
                    className="product-image"
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/300?text=No+Image'; }}
                />
                {product.is_recommended === 1 && <span className="badge-recommended">Recommended</span>}
                {product.stock <= 0 && <div className="out-of-stock-overlay">Out of Stock</div>}
                <button className="btn-wishlist" onClick={toggleLike}>
                    {isLiked ? <FaHeart color="#e53935" /> : <FaRegHeart />}
                </button>
            </div>
            <div className="product-info">
                <div className="product-rating">
                    <FaStar className="star-icon" />
                    <span>{product.avg_rating ? Number(product.avg_rating).toFixed(1) : 'No reviews'}</span>
                    {product.review_count > 0 && <span className="review-count">({product.review_count})</span>}
                </div>
                <h3 className="product-name">{product.name}</h3>
                <p className="product-category">{product.category_name}</p>
                <div className="product-bottom">
                    <span className="product-price">${product.price.toFixed(2)}</span>
                    <button
                        onClick={() => addToCart(product)}
                        className="btn btn-sm"
                        disabled={product.stock <= 0}
                    >
                        {product.stock <= 0 ? 'Sold Out' : 'Add to Cart'}
                    </button>
                </div>
                <Link to={`/product/${product.id}`} className="view-details-link">View Details</Link>
            </div>
        </div>
    );
};

export default ProductCard;
