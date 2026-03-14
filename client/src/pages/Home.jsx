import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ProductCard from '../components/ProductCard';
import Skeleton from '../components/Skeleton';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [recentlyViewed, setRecentlyViewed] = useState([]);

    useEffect(() => {
        document.title = 'ArVr Store | Premium Comfort Fashion';
        const viewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
        setRecentlyViewed(viewed);

        const fetchProducts = async () => {
            try {
                const res = await axios.get('/api/products/recommended');
                setProducts(res.data);
            } catch (error) {
                console.error('Error fetching products:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    return (
        <div className="home-page">
            <header className="hero-section">
                <div className="hero-content">
                    <h1>Comfort First, Style Always</h1>
                    <p>Experience the new collection of ArVr fashion.</p>
                    <Link to="/category/Men" className="btn btn-secondary">Shop Men</Link>
                    <Link to="/category/Women" className="btn btn-secondary" style={{ marginLeft: '1rem' }}>Shop Women</Link>
                </div>
            </header>

            <section className="recommendations">
                <h2>Recommended For You</h2>
                {loading ? (
                    <div className="product-grid">
                        <Skeleton type="product-card" count={4} />
                    </div>
                ) : (
                    <div className="product-grid">
                        {Array.isArray(products) && products.map(product => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )}
            </section>

            {recentlyViewed.length > 0 && (
                <section className="recently-viewed">
                    <h2>Recently Viewed</h2>
                    <div className="product-grid">
                        {recentlyViewed.map(product => (
                            <ProductCard key={`rv-${product.id}`} product={product} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

export default Home;
