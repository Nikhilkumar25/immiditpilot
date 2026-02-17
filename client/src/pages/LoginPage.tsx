import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            // The App component will redirect based on role
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Login failed');
        }
        setLoading(false);
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div style={{ textAlign: 'center', marginBottom: 'var(--space-md)' }}>
                    <img src="/logo.svg" alt="IMMIDIT Logo" style={{ height: '48px', width: 'auto' }} />
                </div>
                <p className="auth-tagline">Rapid Medical Coordination & Care</p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {error && (
                        <div style={{
                            padding: 'var(--space-sm) var(--space-md)', background: 'var(--critical-bg)',
                            color: 'var(--critical)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem'
                        }}>
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            type="email" className="form-input" placeholder="you@example.com"
                            value={email} onChange={(e) => setEmail(e.target.value)} required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'} className="form-input"
                                placeholder="Enter your password"
                                value={password} onChange={(e) => setPassword(e.target.value)} required
                            />
                            <button
                                type="button" onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'
                                }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}
                        style={{ marginTop: 'var(--space-sm)' }}>
                        {loading ? <div className="spinner" /> : <><LogIn size={18} /> Sign In</>}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: 'var(--space-lg)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Don't have an account?{' '}
                    <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>Register</Link>
                </p>

                {/* Demo credentials */}
                <div style={{
                    marginTop: 'var(--space-lg)', padding: 'var(--space-md)',
                    background: 'var(--primary-bg)', borderRadius: 'var(--radius-md)', fontSize: '0.75rem'
                }}>
                    <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--primary)' }}>Demo Accounts (pwd: password123)</div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                        patient@immidit.com · nurse@immidit.com<br />
                        doctor@immidit.com · admin@immidit.com
                    </div>
                </div>
            </div>
        </div>
    );
}
