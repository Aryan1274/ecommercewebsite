import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebookF, FaTwitter, FaInstagram, FaYoutube } from 'react-icons/fa';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-content">
                <div className="footer-section">
                    <h3>ARVR</h3>
                    <p>Comfort First, Style Always. Premium fashion for Men, Women & Kids.</p>
                    <div className="footer-social">
                        <a href="#" aria-label="Facebook"><FaFacebookF /></a>
                        <a href="#" aria-label="Twitter"><FaTwitter /></a>
                        <a href="#" aria-label="Instagram"><FaInstagram /></a>
                        <a href="#" aria-label="YouTube"><FaYoutube /></a>
                    </div>
                </div>

                <div className="footer-section">
                    <h3>Quick Links</h3>
                    <ul>
                        <li><Link to="/">Home</Link></li>
                        <li><Link to="/category/Men">Men</Link></li>
                        <li><Link to="/category/Women">Women</Link></li>
                        <li><Link to="/category/Kids">Kids</Link></li>
                    </ul>
                </div>

                <div className="footer-section">
                    <h3>Customer Service</h3>
                    <ul>
                        <li><Link to="/track-order">Track Order</Link></li>
                        <li><Link to="/profile">My Account</Link></li>
                        <li><Link to="/cart">Shopping Cart</Link></li>
                        <li><a href="#">Shipping Policy</a></li>
                        <li><a href="#">Returns & Exchanges</a></li>
                    </ul>
                </div>

                <div className="footer-section">
                    <h3>Contact Us</h3>
                    <ul>
                        <li>Email: support@arvr.com</li>
                        <li>Phone: +91 98765 43210</li>
                        <li>Mon - Sat: 10AM - 8PM</li>
                    </ul>
                </div>
            </div>
            <div className="footer-bottom">
                <p>&copy; {new Date().getFullYear()} ARVR Fashion. All rights reserved.</p>
            </div>
        </footer>
    );
};

export default Footer;
