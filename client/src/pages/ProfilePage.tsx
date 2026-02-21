import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
    User, Phone, Calendar, Heart, Droplets, AlertCircle,
    LogOut, Save, Loader2, ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

export default function ProfilePage() {
    const { user, logout, setUser } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: '',
        phone: '',
        dateOfBirth: '',
        gender: '',
        bloodGroup: '',
        emergencyContact: '',
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await profileApi.get();
            const u = res.data.user;
            setForm({
                name: u.name || '',
                phone: u.phone || '',
                dateOfBirth: u.dateOfBirth ? new Date(u.dateOfBirth).toISOString().split('T')[0] : '',
                gender: u.gender || '',
                bloodGroup: u.bloodGroup || '',
                emergencyContact: u.emergencyContact || '',
            });
        } catch (err) {
            console.error('Failed to fetch profile', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            addToast('error', 'Name is required');
            return;
        }
        setSaving(true);
        try {
            const res = await profileApi.update({
                name: form.name.trim(),
                dateOfBirth: form.dateOfBirth || undefined,
                gender: form.gender || undefined,
                bloodGroup: form.bloodGroup || undefined,
                emergencyContact: form.emergencyContact || undefined,
            });
            // Update local auth state
            const updatedUser = res.data.user;
            setUser({ ...user!, ...updatedUser });
            localStorage.setItem('immidit_user', JSON.stringify({ ...user!, ...updatedUser }));
            addToast('success', 'Profile updated successfully');
        } catch (err) {
            addToast('error', 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-xl)' }}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">My Profile</h1>
                <p className="page-subtitle">Manage your personal information</p>
            </div>

            {/* Profile Card */}
            <div className="card" style={{ maxWidth: 560 }}>
                {/* Avatar */}
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    marginBottom: 'var(--space-xl)', paddingBottom: 'var(--space-lg)',
                    borderBottom: '1px solid var(--border)'
                }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--primary), hsl(174, 62%, 35%))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: '1.75rem', fontWeight: 700,
                        marginBottom: 'var(--space-sm)', boxShadow: '0 4px 12px rgba(15, 185, 177, 0.3)'
                    }}>
                        {form.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)' }}>
                        {form.name || 'Your Name'}
                    </div>
                    <div style={{
                        fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px',
                        color: 'var(--primary)', fontWeight: 600, marginTop: 2
                    }}>
                        {user?.role}
                    </div>
                </div>

                {/* Form Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {/* Name */}
                    <div className="form-group">
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <User size={14} /> Full Name
                        </label>
                        <input
                            className="form-input"
                            type="text"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            placeholder="Enter your full name"
                        />
                    </div>

                    {/* Phone (readonly) */}
                    <div className="form-group">
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Phone size={14} /> Phone Number
                        </label>
                        <input
                            className="form-input"
                            type="tel"
                            value={`+91 ${form.phone}`}
                            disabled
                            style={{ background: 'var(--bg)', color: 'var(--text-muted)', cursor: 'not-allowed' }}
                        />
                    </div>

                    {/* Date of Birth + Gender row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Calendar size={14} /> Date of Birth
                            </label>
                            <input
                                className="form-input"
                                type="date"
                                value={form.dateOfBirth}
                                onChange={e => setForm({ ...form, dateOfBirth: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <User size={14} /> Gender
                            </label>
                            <select
                                className="form-input"
                                value={form.gender}
                                onChange={e => setForm({ ...form, gender: e.target.value })}
                                style={{ cursor: 'pointer' }}
                            >
                                <option value="">Select</option>
                                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Blood Group + Emergency Contact row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Droplets size={14} /> Blood Group
                            </label>
                            <select
                                className="form-input"
                                value={form.bloodGroup}
                                onChange={e => setForm({ ...form, bloodGroup: e.target.value })}
                                style={{ cursor: 'pointer' }}
                            >
                                <option value="">Select</option>
                                {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <AlertCircle size={14} /> Emergency Contact
                            </label>
                            <input
                                className="form-input"
                                type="tel"
                                placeholder="10-digit number"
                                maxLength={10}
                                value={form.emergencyContact}
                                onChange={e => setForm({ ...form, emergencyContact: e.target.value.replace(/\D/g, '') })}
                            />
                        </div>
                    </div>

                    {/* Save Button */}
                    <button
                        className="btn btn-primary btn-lg btn-block"
                        onClick={handleSave}
                        disabled={saving || !form.name.trim()}
                        style={{ marginTop: 'var(--space-sm)' }}
                    >
                        {saving ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Saving...
                            </span>
                        ) : (
                            <><Save size={18} /> Save Profile</>
                        )}
                    </button>
                </div>
            </div>

            {/* Logout Section */}
            <div className="card" style={{ maxWidth: 560, marginTop: 'var(--space-lg)' }}>
                <button
                    className="btn btn-block"
                    onClick={handleLogout}
                    style={{
                        background: 'hsl(0, 90%, 96%)', color: 'hsl(0, 70%, 45%)',
                        border: '1px solid hsl(0, 70%, 85%)', fontWeight: 600,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}
                >
                    <LogOut size={18} /> Sign Out
                </button>
            </div>
        </div>
    );
}
