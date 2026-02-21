import React, { ReactNode, useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
    LayoutDashboard, LogOut, User, Stethoscope, Heart, ShieldCheck,
    ClipboardList, FlaskConical, Calendar, Settings,
    Radio, DollarSign, MapPin, Syringe, FileText, RotateCcw,
    CreditCard, Megaphone, Bell, ScrollText, Package
} from 'lucide-react';
import VideoCall from '../components/VideoCall';

interface Props {
    children: ReactNode;
}

const NAV_ITEMS: Record<string, { label: string; path: string; icon: React.ReactNode }[]> = {
    patient: [
        { label: 'Dashboard', path: '/patient', icon: <LayoutDashboard size={18} /> },
        { label: 'Book Visit', path: '/patient/book', icon: <Calendar size={18} /> },
        { label: 'Profile', path: '/profile', icon: <User size={18} /> },
    ],
    nurse: [
        { label: 'Dashboard', path: '/nurse', icon: <LayoutDashboard size={18} /> },
        { label: 'Profile', path: '/profile', icon: <User size={18} /> },
    ],
    doctor: [
        { label: 'Dashboard', path: '/doctor', icon: <LayoutDashboard size={18} /> },
        { label: 'Profile', path: '/profile', icon: <User size={18} /> },
    ],
    admin: [
        { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={18} /> },
        { label: 'Live Operations', path: '/admin/live', icon: <Radio size={18} /> },
        { label: 'Services', path: '/admin/services', icon: <ClipboardList size={18} /> },
        { label: 'Pricing', path: '/admin/pricing', icon: <DollarSign size={18} /> },
        { label: 'Zones', path: '/admin/zones', icon: <MapPin size={18} /> },
        { label: 'Nurses', path: '/admin/nurses', icon: <Heart size={18} /> },
        { label: 'Doctors', path: '/admin/doctors', icon: <Stethoscope size={18} /> },
        { label: 'Lab Tests', path: '/admin/lab-tests', icon: <FlaskConical size={18} /> },
        { label: 'Templates', path: '/admin/templates', icon: <FileText size={18} /> },
        { label: 'Follow-Ups', path: '/admin/follow-ups', icon: <RotateCcw size={18} /> },
        { label: 'Inventory', path: '/admin/inventory', icon: <Package size={18} /> },
        { label: 'Payments', path: '/admin/payments', icon: <CreditCard size={18} /> },
        { label: 'Use Cases', path: '/admin/use-cases', icon: <Megaphone size={18} /> },
        { label: 'Notifications', path: '/admin/notifications', icon: <Bell size={18} /> },
        { label: 'Audit Logs', path: '/admin/audit-logs', icon: <ScrollText size={18} /> },
        { label: 'Settings', path: '/admin/settings', icon: <Settings size={18} /> },
    ],
    lab: [
        { label: 'Dashboard', path: '/lab', icon: <LayoutDashboard size={18} /> },
        { label: 'Profile', path: '/profile', icon: <User size={18} /> },
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
    patient: '#F25022',
    nurse: '#0FB9B1',
    doctor: '#8B5CF6',
    admin: '#FFB900',
    lab: '#14B8A6',
};

export default function DashboardLayout({ children }: Props) {
    const { user, logout } = useAuth();
    const { socket } = useSocket();
    const navigate = useNavigate();
    const location = useLocation();
    const [badges, setBadges] = useState<Record<string, number>>({});

    // Global incoming video call state
    const [incomingCall, setIncomingCall] = useState<{
        callerId: string; callerName: string; callerRole: string;
        serviceId: string; offer: RTCSessionDescriptionInit;
    } | null>(null);

    // Listen for incoming video calls globally
    useEffect(() => {
        if (!socket) return;
        const onIncoming = (data: any) => {
            console.log('📞 Incoming call received:', data.callerName);
            setIncomingCall(data);
        };
        socket.on('call_incoming', onIncoming);
        return () => { socket.off('call_incoming', onIncoming); };
    }, [socket]);

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
                    <div style={{ marginBottom: 'var(--space-sm)' }}>
                        <img src="/logo-light.svg" alt="IMMIDIT Logo" style={{ height: '32px', width: 'auto' }} />
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
                        {user.role !== 'patient' && (
                            <div style={{
                                fontSize: '0.688rem', textTransform: 'uppercase', letterSpacing: '0.5px',
                                color: ROLE_COLORS[user.role], fontWeight: 600
                            }}>
                                {user.role}
                            </div>
                        )}
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

            </aside>

            {/* Main content */}
            <main className="main-content">
                {children}
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="bottom-nav mobile-only">
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
                            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
                        >
                            {React.cloneElement(item.icon as React.ReactElement, { size: 20 })}
                            <span>{item.label}</span>
                            {badge > 0 && (
                                <span className="badge">
                                    {badge > 9 ? '9+' : badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Global Incoming Call Overlay */}
            {incomingCall && (
                <VideoCall
                    incomingCall={incomingCall}
                    onClose={() => setIncomingCall(null)}
                />
            )}
        </div>
    );
}
