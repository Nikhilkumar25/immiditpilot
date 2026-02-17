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
            await register(form);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Registration failed');
        }
        setLoading(false);
    };

    const update = (key: string, value: string) => setForm({ ...form, [key]: value });

    const roles = [
        { value: 'patient', label: '👤 User', color: '#F25022' },
        { value: 'nurse', label: '👩‍⚕️ Nurse', color: '#0FB9B1' },
        { value: 'doctor', label: '👨‍⚕️ Doctor', color: '#8B5CF6' },
        { value: 'admin', label: '🛡️ Admin', color: '#FFB900' },
    ];

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

                    {/* Role selector */}
                    <div className="form-group">
                        <label className="form-label">I am a</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                            {roles.map((r) => (
                                <button
                                    key={r.value} type="button" onClick={() => update('role', r.value)}
                                    style={{
                                        padding: '10px', borderRadius: 'var(--radius-md)', fontSize: '0.875rem',
                                        fontWeight: form.role === r.value ? 700 : 400,
                                        background: form.role === r.value ? `${r.color}15` : 'var(--bg)',
                                        border: `2px solid ${form.role === r.value ? r.color : 'var(--border)'}`,
                                        color: form.role === r.value ? r.color : 'var(--text-secondary)',
                                        cursor: 'pointer', transition: 'var(--transition)',
                                    }}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>

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
