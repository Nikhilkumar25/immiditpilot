import React, { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
    LayoutDashboard, LogOut, User, Stethoscope, Heart, ShieldCheck,
    ClipboardList, FlaskConical, Calendar, Settings
} from 'lucide-react';

interface Props {
    children: ReactNode;
}

const NAV_ITEMS: Record<string, { label: string; path: string; icon: React.ReactNode }[]> = {
    patient: [
        { label: 'Dashboard', path: '/patient', icon: <LayoutDashboard size={18} /> },
        { label: 'Book Visit', path: '/patient/book', icon: <Calendar size={18} /> },
    ],
    nurse: [
        { label: 'Dashboard', path: '/nurse', icon: <LayoutDashboard size={18} /> },
    ],
    doctor: [
        { label: 'Dashboard', path: '/doctor', icon: <LayoutDashboard size={18} /> },
    ],
    admin: [
        { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={18} /> },
    ],
    lab: [
        { label: 'Dashboard', path: '/lab', icon: <LayoutDashboard size={18} /> },
    ],
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
    patient: <User size={16} />,
    nurse: <Heart size={16} />,
    doctor: <Stethoscope size={16} />,
    admin: <ShieldCheck size={16} />,
    lab: <FlaskConical size={16} />,
};

const ROLE_COLORS: Record<string, string> = {
    patient: '#1E6FFB',
    nurse: '#0FB9B1',
    doctor: '#8B5CF6',
    admin: '#F59E0B',
    lab: '#14B8A6',
};

export default function DashboardLayout({ children }: Props) {
    const { user, logout } = useAuth();
    const { socket } = useSocket();
    const navigate = useNavigate();
    const location = useLocation();
    const [badges, setBadges] = useState<Record<string, number>>({});

    useEffect(() => {
        if (!socket || !user) return;

        const updateBadge = (path: string, delta: number) => {
            setBadges(prev => ({
                ...prev,
                [path]: Math.max(0, (prev[path] || 0) + delta)
            }));
        };

        // Patient notifications
        socket.on('status_update', () => user.role === 'patient' && updateBadge('/patient', 1));

        // Nurse notifications
        socket.on('nurse_assigned', () => user.role === 'nurse' && updateBadge('/nurse', 1));

        // Doctor notifications
        socket.on('vitals_submitted', () => user.role === 'doctor' && updateBadge('/doctor', 1));
        socket.on('report_uploaded', () => user.role === 'doctor' && updateBadge('/doctor', 1));

        // Lab notifications
        socket.on('lab_order_created', () => user.role === 'lab' && updateBadge('/lab', 1));

        // Admin notifications
        socket.on('new_service_request', () => user.role === 'admin' && updateBadge('/admin', 1));

        return () => {
            socket.off('status_update');
            socket.off('nurse_assigned');
            socket.off('vitals_submitted');
            socket.off('report_uploaded');
            socket.off('lab_order_created');
            socket.off('new_service_request');
        };
    }, [socket, user]);

    if (!user) return null;

    const navItems = NAV_ITEMS[user.role] || [];

    return (
        <div className="page-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div style={{ marginBottom: 'var(--space-xl)' }}>
                    <div className="auth-logo" style={{ fontSize: '1.5rem', textAlign: 'left' }}>
                        Immidit
                    </div>
                    <div style={{ fontSize: '0.688rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                        Medical Coordination
                    </div>
                </div>

                {/* User info */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                    background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-xl)'
                }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: ROLE_COLORS[user.role], display: 'flex',
                        alignItems: 'center', justifyContent: 'center', color: 'white'
                    }}>
                        {ROLE_ICONS[user.role]}
                    </div>
                    <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user.name}</div>
                        <div style={{
                            fontSize: '0.688rem', textTransform: 'uppercase', letterSpacing: '0.5px',
                            color: ROLE_COLORS[user.role], fontWeight: 600
                        }}>
                            {user.role}
                        </div>
                    </div>
                </div>

                {/* Nav items */}
                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        const badge = badges[item.path];
                        return (
                            <button
                                key={item.path}
                                onClick={() => {
                                    setBadges(prev => ({ ...prev, [item.path]: 0 }));
                                    navigate(item.path);
                                }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '10px 12px', borderRadius: 'var(--radius-md)',
                                    background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                                    color: isActive ? 'white' : 'rgba(255,255,255,0.5)',
                                    border: 'none', cursor: 'pointer', fontSize: '0.875rem',
                                    fontWeight: isActive ? 600 : 400, textAlign: 'left',
                                    transition: 'var(--transition)', width: '100%',
                                    position: 'relative'
                                }}
                            >
                                {item.icon}
                                {item.label}
                                {badge > 0 && (
                                    <span style={{
                                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                        background: 'var(--critical)', color: 'white', fontSize: '10px',
                                        padding: '2px 6px', borderRadius: '10px', minWidth: '18px',
                                        textAlign: 'center', fontWeight: 700
                                    }}>
                                        {badge > 9 ? '9+' : badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Logout */}
                <button
                    onClick={() => { logout(); navigate('/login'); }}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 12px', borderRadius: 'var(--radius-md)',
                        background: 'transparent', color: 'rgba(255,255,255,0.4)',
                        border: 'none', cursor: 'pointer', fontSize: '0.875rem',
                        transition: 'var(--transition)', width: '100%'
                    }}
                >
                    <LogOut size={18} />
                    Logout
                </button>
            </aside>

            {/* Main content */}
            <main className="main-content">
                {children}
            </main>
        </div>
    );
}
