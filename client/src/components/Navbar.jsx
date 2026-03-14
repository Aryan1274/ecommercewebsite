import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { FaShoppingCart, FaUser, FaBars, FaTimes, FaSearch, FaMoon, FaSun } from 'react-icons/fa';

const Navbar = () => {
    const { user, logout } = useAuth();
    const { cartCount } = useCart();
    const { isDarkMode, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (searchQuery.trim().length > 1) {
                try {
                    const res = await axios.get(`/api/products?search=${searchQuery}&limit=5`);
                    setSuggestions(res.data.products || []);
                    setShowSuggestions(true);
                } catch (error) {
                    console.error('Error fetching suggestions:', error);
                }
            } else {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        };

        const timer = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/search?q=${searchQuery}`);
            setSearchQuery('');
            setShowSuggestions(false);
            setSuggestions([]);
            setIsMenuOpen(false);
        }
    };

    const handleSuggestionClick = (productId) => {
        navigate(`/product/${productId}`);
        setSearchQuery('');
        setShowSuggestions(false);
        setSuggestions([]);
        setIsMenuOpen(false);
    };

    return (
        <nav className="navbar">
            <div className="nav-container">
                <Link to="/" className="nav-logo">ARVR</Link>

                <div className="nav-search-container">
                    <form className="nav-search" onSubmit={handleSearch}>
                        <input
                            type="text"
                            placeholder="Search products..."
                            className="search-input"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => searchQuery.trim().length > 1 && setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        />
                        <button type="submit" className="search-btn"><FaSearch /></button>
                    </form>

                    {showSuggestions && suggestions.length > 0 && (
                        <ul className="search-suggestions">
                            {suggestions.map(product => (
                                <li key={product.id} onClick={() => handleSuggestionClick(product.id)}>
                                    <img src={product.image_url} alt="" onError={(e) => e.target.src = 'https://via.placeholder.com/40'} />
                                    <div className="suggestion-info">
                                        <span className="suggestion-name">{product.name}</span>
                                        <span className="suggestion-price">${product.price}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="nav-mobile-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                    {isMenuOpen ? <FaTimes /> : <FaBars />}
                </div>

                <ul className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
                    <li><Link to="/" onClick={() => setIsMenuOpen(false)}>Home</Link></li>
                    <li><Link to="/category/Men" onClick={() => setIsMenuOpen(false)}>Men</Link></li>
                    <li><Link to="/category/Women" onClick={() => setIsMenuOpen(false)}>Women</Link></li>
                    <li><Link to="/category/Kids" onClick={() => setIsMenuOpen(false)}>Kids</Link></li>

                    {user?.role === 'admin' && (
                        <li><Link to="/admin" className="admin-link" onClick={() => setIsMenuOpen(false)}>Admin</Link></li>
                    )}
                </ul>

                <div className="nav-icons">
                    <Link to="/cart" className="cart-icon">
                        <FaShoppingCart />
                        {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
                    </Link>

                    {user ? (
                        <div className="user-menu">
                            <Link to="/profile" className="user-name">Hi, {user.name}</Link>
                            <button onClick={handleLogout} className="btn-logout">Logout</button>
                        </div>
                    ) : (
                        <Link to="/login" className="login-icon"><FaUser /></Link>
                    )}

                    <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle Theme">
                        {isDarkMode ? <FaSun /> : <FaMoon />}
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
