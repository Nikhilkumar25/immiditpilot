import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus } from 'lucide-react';

export default function RegisterPage() {
    const [form, setForm] = useState({ email: '', password: '', name: '', phone: '', role: 'patient' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await register({ ...form, verificationToken: 'MANUAL_OVERRIDE_DEV' });
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Registration failed');
        }
        setLoading(false);
    };

    const update = (key: string, value: string) => setForm({ ...form, [key]: value });

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div style={{ textAlign: 'center', marginBottom: 'var(--space-md)' }}>
                    <img src="/logo.svg" alt="IMMIDIT Logo" style={{ height: '48px', width: 'auto' }} />
                </div>
                <p className="auth-tagline">Join Rapid Medical Coordination</p>

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
                        <label className="form-label">Full Name</label>
                        <input type="text" className="form-input" placeholder="Your full name"
                            value={form.name} onChange={(e) => update('name', e.target.value)} required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input type="email" className="form-input" placeholder="you@example.com"
                            value={form.email} onChange={(e) => update('email', e.target.value)} required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Phone</label>
                        <input type="tel" className="form-input" placeholder="+91 9876543210"
                            value={form.phone} onChange={(e) => update('phone', e.target.value)} required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input type="password" className="form-input" placeholder="Min. 6 characters"
                            value={form.password} onChange={(e) => update('password', e.target.value)} required minLength={6} />
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}
                        style={{ marginTop: 'var(--space-sm)' }}>
                        {loading ? <div className="spinner" /> : <><UserPlus size={18} /> Create Account</>}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: 'var(--space-lg)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Already have an account?{' '}
                    <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign In</Link>
                </p>
            </div>
        </div>
    );
}
