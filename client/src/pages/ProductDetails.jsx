import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { FaStar } from 'react-icons/fa';
import ProductCard from '../components/ProductCard';
import Skeleton from '../components/Skeleton';
import './ProductDetails.css';

const ProductDetails = () => {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedSize, setSelectedSize] = useState('');
    const [selectedColor, setSelectedColor] = useState('');
    const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
    const [loading, setLoading] = useState(true);
    const [imageFading, setImageFading] = useState(false);
    const [validationError, setValidationError] = useState('');
    const { addToCart } = useCart();
    const { user } = useAuth();
    const toast = useToast();

    const fetchProduct = async () => {
        try {
            const res = await axios.get(`/api/products/${id}`);
            setProduct(res.data);
            setSelectedImage(res.data.image_url);
            document.title = `${res.data.name} | ArVr Store`;
            if (res.data.variants && res.data.variants.length > 0) {
                // Pre-select first variant
                setSelectedSize(res.data.variants[0].size);
                setSelectedColor(res.data.variants[0].color);
            }
        } catch (error) {
            console.error('Error fetching product:', error);
        }
    };

    const fetchReviews = async () => {
        try {
            const res = await axios.get(`/api/products/${id}/reviews`);
            setReviews(res.data);
        } catch (error) {
            console.error('Error fetching reviews:', error);
        }
    };

    const fetchRelatedProducts = async () => {
        try {
            const res = await axios.get(`/api/products/${id}/related`);
            setRelatedProducts(res.data);
        } catch (error) {
            console.error('Error fetching related products:', error);
        }
    };

    useEffect(() => {
        const loadPageData = async () => {
            setLoading(true);
            await Promise.all([fetchProduct(), fetchReviews(), fetchRelatedProducts()]);
            setLoading(false);
            window.scrollTo(0, 0); // Scroll to top when product changes
        };
        loadPageData();
    }, [id]);

    // Track recently viewed separately to ensure product is available
    useEffect(() => {
        if (product && product.id === Number(id)) {
            const viewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
            const filtered = viewed.filter(v => v.id !== product.id);
            const newItem = {
                id: product.id,
                name: product.name,
                price: product.price,
                image_url: product.image_url,
                category_name: product.category_name
            };
            const updated = [newItem, ...filtered].slice(0, 5);
            localStorage.setItem('recentlyViewed', JSON.stringify(updated));
        }
    }, [product, id]);

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`/api/products/${id}/reviews`, newReview);
            setNewReview({ rating: 5, comment: '' });
            toast.success('Review posted successfully!');
            fetchReviews(); // Refresh reviews
            fetchProduct(); // Refresh aggregate rating
        } catch (error) {
            toast.error('Failed to post review');
        }
    };


    if (loading) return (
        <div className="pd-container">
            <Skeleton type="product-details" />
        </div>
    );
    if (!product) return <div className="not-found">Product not found</div>;

    return (
        <div className="product-details-page">
            <div className="pd-container">
                <div className="pd-image-section">
                    <div className="main-image-container">
                        <img
                            src={selectedImage || product.image_url}
                            alt={product.name}
                            className="pd-image"
                            onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/400?text=No+Image'; }}
                        />
                    </div>
                    {product.images && product.images.length > 0 && (
                        <div className="image-thumbnails">
                            <img
                                src={product.image_url}
                                alt="Main"
                                className={`thumbnail ${selectedImage === product.image_url ? 'active' : ''}`}
                                onClick={() => setSelectedImage(product.image_url)}
                            />
                            {product.images.map((img, idx) => (
                                <img
                                    key={idx}
                                    src={img.image_url || img}
                                    alt={img.alt_text || `View ${idx + 2}`}
                                    className={`thumbnail ${selectedImage === (img.image_url || img) ? 'active' : ''}`}
                                    onClick={() => {
                                        setImageFading(true);
                                        setTimeout(() => {
                                            setSelectedImage(img.image_url || img);
                                            setImageFading(false);
                                        }, 200);
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
                <div className="pd-info-section">
                    <div className="pd-rating">
                        <FaStar className="star-icon" />
                        <span className="avg-rating">{product.avg_rating ? Number(product.avg_rating).toFixed(1) : 'No ratings'}</span>
                        <span className="review-count">({product.review_count || 0} reviews)</span>
                    </div>
                    <h1 className="pd-title">{product.name}</h1>
                    <p className="pd-category">{product.category_name}</p>
                    <p className="pd-price">${product.price}</p>

                    {/* Variant Selection */}
                    <div className="variant-selection">
                        {product.variants && product.variants.some(v => v.size) && (
                            <div className="variant-group">
                                <h3>Size</h3>
                                <div className="swatches">
                                    {[...new Set(product.variants.map(v => v.size))].map(size => (
                                        <button
                                            key={size}
                                            className={`swatch ${selectedSize === size ? 'active' : ''}`}
                                            onClick={() => setSelectedSize(size)}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {product.variants && product.variants.some(v => v.color) && (
                            <div className="variant-group">
                                <h3>Color</h3>
                                <div className="swatches">
                                    {[...new Set(product.variants.map(v => v.color))].map(color => (
                                        <button
                                            key={color}
                                            className={`swatch color-swatch ${selectedColor === color ? 'active' : ''}`}
                                            style={{ backgroundColor: color.toLowerCase() }}
                                            onClick={() => setSelectedColor(color)}
                                            title={color}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <p className="pd-stock">
                        Status: <span className={product.variants?.find(v => v.size === selectedSize && v.color === selectedColor)?.stock > 0 || product.stock > 0 ? 'in-stock' : 'out-of-stock'}>
                            {product.variants?.find(v => v.size === selectedSize && v.color === selectedColor)?.stock > 0 || product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                        </span>
                    </p>

                    <p className="pd-description">{product.description || "Experience true comfort with this premium quality item. Designed for modern living."}</p>

                    <div className="pd-features">
                        <h3>Comfort Features</h3>
                        <ul>
                            <li>Level: {product.comfort_level || "Standard"}</li>
                            <li>Breathable Material</li>
                            <li>Classic Fit</li>
                        </ul>
                    </div>

                    {validationError && <p className="pd-validation-error">{validationError}</p>}

                    <div className="pd-actions">
                        <button
                            className="btn btn-lg"
                            disabled={!(product.variants?.find(v => v.size === selectedSize && v.color === selectedColor)?.stock > 0 || product.stock > 0)}
                            onClick={() => {
                                if (product.variants?.length > 0 && (!selectedSize || !selectedColor)) {
                                    setValidationError('Please select size and color!');
                                    return;
                                }
                                setValidationError('');
                                addToCart({ ...product, selectedSize, selectedColor });
                                toast.success('Added to cart!');
                            }}
                        >
                            {product.variants?.find(v => v.size === selectedSize && v.color === selectedColor)?.stock > 0 || product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Reviews Section */}
            <div className="reviews-section">
                <h2>Customer Reviews</h2>

                {user ? (
                    <form className="review-form" onSubmit={handleReviewSubmit}>
                        <h3>Write a Review</h3>
                        <div className="rating-selector">
                            <span>Your Rating: </span>
                            {[1, 2, 3, 4, 5].map(star => (
                                <FaStar
                                    key={star}
                                    className={`star-choice ${newReview.rating >= star ? 'active' : ''}`}
                                    onClick={() => setNewReview({ ...newReview, rating: star })}
                                />
                            ))}
                        </div>
                        <textarea
                            placeholder="Share your thoughts about this product..."
                            value={newReview.comment}
                            onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                            required
                        />
                        <button type="submit" className="btn">Post Review</button>
                    </form>
                ) : (
                    <div className="review-login-prompt">
                        <p>Please <Link to="/login">login</Link> to write a review.</p>
                    </div>
                )}

                <div className="reviews-list">
                    {reviews.length > 0 ? (
                        reviews.map(review => (
                            <div key={review.id} className="review-item">
                                <div className="review-header">
                                    <span className="review-user">{review.user_name}</span>
                                    <span className="review-date">{new Date(review.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="review-rating">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <FaStar
                                            key={star}
                                            className={review.rating >= star ? 'star-filled' : 'star-empty'}
                                        />
                                    ))}
                                </div>
                                <p className="review-comment">{review.comment}</p>
                            </div>
                        ))
                    ) : (
                        <p className="no-reviews">No reviews yet. Be the first to review!</p>
                    )}
                </div>
            </div>

            {/* Related Products Section */}
            {relatedProducts.length > 0 && (
                <div className="related-products-section" style={{ marginTop: '5rem', borderTop: '1px solid var(--gray-200)', paddingTop: '3rem' }}>
                    <h2 style={{ fontSize: '1.8rem', marginBottom: '2rem', color: 'var(--primary)' }}>Related Products</h2>
                    <div className="product-grid">
                        {relatedProducts.map(rp => (
                            <ProductCard key={rp.id} product={rp} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductDetails;
