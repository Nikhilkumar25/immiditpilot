import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon, Mail, Phone, Calendar, Droplets, AlertCircle, Clipboard } from 'lucide-react';

export default function Profile() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    if (!user) return null;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const infoGroups = [
        {
            title: 'Personal Information',
            items: [
                { label: 'Full Name', value: user.name, icon: <UserIcon size={18} /> },
                { label: 'Email Address', value: user.email, icon: <Mail size={18} /> },
                { label: 'Phone Number', value: user.phone, icon: <Phone size={18} /> },
                { label: 'Gender', value: user.gender || 'Not specified', icon: <UserIcon size={18} /> },
                { label: 'Age', value: user.age ? `${user.age} years` : 'Not specified', icon: <Calendar size={18} /> },
                ...(user.role === 'doctor' ? [{ label: 'Medical Reg No', value: user.medicalRegNo || 'Not set', icon: <Clipboard size={18} /> }] : []),
            ]
        },
        {
            title: 'Medical Details',
            items: [
                { label: 'Blood Group', value: user.bloodGroup || 'Not specified', icon: <Droplets size={18} color="var(--critical)" /> },
                { label: 'Allergic Info', value: user.allergicInfo || 'None reported', icon: <AlertCircle size={18} color="var(--warning)" /> },
                { label: 'Medical History', value: user.medicalHistory || 'No chronic diseases reported', icon: <Clipboard size={18} color="var(--primary)" /> },
            ]
        }
    ];

    // Note: To actually EDIT these fields, we would need a form.
    // Given the prompt, I'll add an "Edit Profile" button that opens a simple prompt or similar
    // for now to at least let them set the registration number.

    return (
        <div className="profile-container" style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--space-lg)' }}>
            <div className="card" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-xl)', textAlign: 'center' }}>
                <div style={{
                    width: 80, height: 80, borderRadius: '50%', background: 'var(--primary-bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-md)'
                }}>
                    <UserIcon size={40} color="var(--primary)" />
                </div>
                <h2 style={{ margin: '0 0 var(--space-xs)' }}>{user.name}</h2>
                {user.role !== 'patient' && (
                    <div className="badge badge-info" style={{ textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 'var(--space-sm)' }}>{user.role}</div>
                )}

                {user.role === 'doctor' && (
                    <div style={{ marginTop: 'var(--space-md)' }}>
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                                const regNo = prompt('Enter Medical Registration Number:', user.medicalRegNo || '');
                                if (regNo !== null) {
                                    // Use api to update
                                    import('../services/api').then(m => {
                                        m.profileApi.update({ medicalRegNo: regNo }).then(() => {
                                            window.location.reload();
                                        });
                                    });
                                }
                            }}
                        >
                            Update Reg No
                        </button>
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
                {infoGroups.map((group, idx) => (
                    <div key={idx} className="card" style={{ padding: 'var(--space-lg)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: 'var(--space-md)', fontSize: '1.125rem', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-sm)' }}>
                            {group.title}
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-lg)' }}>
                            {group.items.map((item, i) => (
                                <div key={i} style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
                                    <div style={{ marginTop: 2, color: 'var(--text-secondary)' }}>{item.icon}</div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>
                                            {item.label}
                                        </div>
                                        <div style={{ fontWeight: 500, color: 'var(--text)' }}>
                                            {item.value}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <button
                className="btn btn-danger btn-lg btn-block"
                onClick={handleLogout}
                style={{ marginTop: 'var(--space-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-sm)' }}
            >
                <LogOut size={20} />
                Sign Out from IMMIDIT
            </button>
        </div>
    );
}
