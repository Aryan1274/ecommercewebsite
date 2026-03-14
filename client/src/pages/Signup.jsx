import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';

const Signup = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1); // 1 = Details, 2 = Verify OTP
    const [loading, setLoading] = useState(false);

    const { signup, sendOtp, verifyOtp, login } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        document.title = 'Sign Up | ArVr Store';
    }, []);

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        if (name.trim().length < 2) {
            setError('Name must be at least 2 characters');
            return;
        }
        if (!email.includes('@')) {
            setError('Please enter a valid email address');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            await sendOtp(email);
            setStep(2);
            setSuccessMsg('Verification code sent to your email!');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send verification code');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAndSignup = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        if (otp.length !== 6) {
            setError('Please enter a valid 6-digit code');
            return;
        }

        setLoading(true);
        try {
            await verifyOtp(email, otp);
            await signup(name, email, password);
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Verification or signup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Sign Up</h2>
                {error && <p className="error-message">{error}</p>}
                {successMsg && <p className="success-message" style={{ color: 'green', marginBottom: '1rem', textAlign: 'center' }}>{successMsg}</p>}

                {step === 1 ? (
                    <form onSubmit={handleSendOtp}>
                        <div className="form-group">
                            <label>Name</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required disabled={loading} />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} />
                        </div>
                        <button type="submit" className="btn btn-full" disabled={loading}>
                            {loading ? 'Sending Code...' : 'Send Verification Code'}
                        </button>
                        <p className="auth-switch">Already have an account? <Link to="/login">Login</Link></p>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyAndSignup}>
                        <p style={{ textAlign: 'center', marginBottom: '1rem', color: '#555', fontSize: '0.9rem' }}>
                            We've sent a 6-digit code to <strong>{email}</strong>.
                        </p>
                        <div className="form-group">
                            <label>Verification Code</label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                maxLength="6"
                                placeholder="Enter 6-digit code"
                                required
                                disabled={loading}
                                style={{ letterSpacing: '2px', textAlign: 'center', fontSize: '1.2rem' }}
                            />
                        </div>
                        <button type="submit" className="btn btn-full" disabled={loading}>
                            {loading ? 'Verifying...' : 'Verify & Create Account'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-secondary btn-full"
                            style={{ marginTop: '10px' }}
                            onClick={() => setStep(1)}
                            disabled={loading}
                        >
                            Back
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Signup;
