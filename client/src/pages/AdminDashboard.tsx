import React, { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { BarChart3, Users, Clock, Activity, FlaskConical, TrendingUp, UserPlus, FileText, Inbox, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminDashboard() {
    const [kpis, setKpis] = useState<any>(null);
    const [services, setServices] = useState<any[]>([]);
    const [nurses, setNurses] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const { socket } = useSocket();
    const { addToast } = useToast();

    const fetchData = useCallback(async () => {
        try {
            const [kpiRes, servicesRes, nursesRes, usersRes, logsRes] = await Promise.all([
                adminApi.getKpis(),
                adminApi.getServices(),
                adminApi.getUsers('nurse'),
                adminApi.getUsers(), // All users
                adminApi.getAuditLogs(),
            ]);
            setKpis(kpiRes.data);
            setServices(servicesRes.data);
            setNurses(nursesRes.data);
            setAllUsers(usersRes.data);
            setAuditLogs(logsRes.data);
        } catch (err) { console.error(err); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        if (!socket) return;
        socket.on('new_service_request', () => { addToast('info', 'New service request!'); fetchData(); });
        socket.on('status_update', () => fetchData());
        socket.on('nurse_assigned', () => fetchData());
        return () => { socket.off('new_service_request'); socket.off('status_update'); };
    }, [socket, fetchData, addToast]);

    const handleAssignNurse = async (serviceId: string, nurseId: string) => {
        try {
            await adminApi.assignNurse(serviceId, nurseId);
            addToast('success', 'Nurse assigned successfully');
            fetchData();
        } catch (err: any) {
            addToast('error', err.response?.data?.error || 'Failed to assign nurse');
        }
    };

    const handleStatusChange = async (serviceId: string, status: string) => {
        try {
            await adminApi.updateStatus(serviceId, status);
            addToast('success', 'Status updated');
            fetchData();
        } catch (err: any) {
            addToast('error', err.response?.data?.error || 'Failed to update status');
        }
    };

    const handleUpdateRole = async (userId: string, role: string) => {
        try {
            await adminApi.updateUserRole(userId, role);
            addToast('success', `User role updated to ${role}`);
            fetchData();
        } catch (err: any) {
            addToast('error', err.response?.data?.error || 'Failed to update role');
        }
    };

    if (loading) return <div className="loading-page"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">Admin Panel</h1>
                    <p className="page-subtitle">Manage operations and monitor KPIs</p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={fetchData}><RefreshCw size={14} /> Refresh</button>
            </div>

            {/* Tabs */}
            <div className="tabs">
                {[
                    { key: 'overview', label: 'Overview' },
                    { key: 'cases', label: `Cases (${services.length})` },
                    { key: 'users', label: 'Users' },
                    { key: 'audit', label: 'Audit Log' },
                ].map((tab) => (
                    <button key={tab.key} className={`tab ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}>{tab.label}</button>
                ))}
            </div>

            {/* Overview */}
            {activeTab === 'overview' && kpis && (
                <>
                    <div className="kpi-grid">
                        <div className="kpi-card">
                            <Activity size={20} color="var(--primary)" />
                            <div className="kpi-value">{kpis.activeCases}</div>
                            <div className="kpi-label">Active Cases</div>
                        </div>
                        <div className="kpi-card">
                            <BarChart3 size={20} color="var(--success)" />
                            <div className="kpi-value">{kpis.completedCases}</div>
                            <div className="kpi-label">Completed</div>
                        </div>
                        <div className="kpi-card">
                            <Clock size={20} color="var(--warning)" />
                            <div className="kpi-value">{kpis.avgCompletionTimeHours}h</div>
                            <div className="kpi-label">Avg Completion</div>
                        </div>
                        <div className="kpi-card">
                            <FlaskConical size={20} color="var(--secondary)" />
                            <div className="kpi-value">{kpis.labConversionRate}%</div>
                            <div className="kpi-label">Lab Conversion</div>
                        </div>
                        <div className="kpi-card">
                            <Users size={20} color="var(--primary)" />
                            <div className="kpi-value">{kpis.users.patients}</div>
                            <div className="kpi-label">Patients</div>
                        </div>
                        <div className="kpi-card">
                            <UserPlus size={20} color="var(--secondary)" />
                            <div className="kpi-value">{kpis.users.nurses}</div>
                            <div className="kpi-label">Nurses</div>
                        </div>
                    </div>

                    {/* Pending assignments */}
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
                        ⏳ Pending Nurse Assignment
                    </h3>
                    {services.filter(s => s.status === 'pending_nurse_assignment').length === 0 ? (
                        <div className="empty-state"><p>No pending assignments</p></div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                            {services.filter(s => s.status === 'pending_nurse_assignment').map((s) => (
                                <div key={s.id} className="card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                        <div>
                                            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {s.patient?.name} — {s.serviceType}
                                                {s.isImmediate && <span className="badge badge-warning" style={{ fontSize: '0.625rem' }}>⚡ IMMEDIATE</span>}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.location}</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <select className="form-select" style={{ minHeight: 36, width: 'auto' }}
                                                onChange={(e) => e.target.value && handleAssignNurse(s.id, e.target.value)}
                                                defaultValue="">
                                                <option value="" disabled>Assign nurse...</option>
                                                {nurses.map((n) => (
                                                    <option key={n.id} value={n.id}>{n.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Cases */}
            {activeTab === 'cases' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                    {services.map((s) => (
                        <div key={s.id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                                <div>
                                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {s.patient?.name} — {s.serviceType}
                                        {s.isImmediate && <span className="badge badge-warning" style={{ fontSize: '0.625rem' }}>⚡ IMMEDIATE</span>}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        Nurse: {s.nurse?.name || '—'} · Doctor: {s.doctor?.name || '—'}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        Created: {format(new Date(s.createdAt), 'MMM d, h:mm a')}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span className="badge badge-primary" style={{ textTransform: 'uppercase', fontSize: '0.688rem' }}>
                                        {s.status.replace(/_/g, ' ')}
                                    </span>
                                    {s.status !== 'completed' && s.status !== 'cancelled' && (
                                        <select className="form-select" style={{ minHeight: 36, width: 'auto', fontSize: '0.75rem' }}
                                            value="" onChange={(e) => e.target.value && handleStatusChange(s.id, e.target.value)}>
                                            <option value="" disabled>Change...</option>
                                            <option value="cancelled">Cancel</option>
                                            {s.status === 'doctor_completed' && <option value="completed">Complete</option>}
                                        </select>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Users Management */}
            {activeTab === 'users' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>User Management</h2>
                        <div className="badge badge-primary">{allUsers.length} Total Users</div>
                    </div>

                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}>Name</th>
                                    <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}>Role</th>
                                    <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}>Phone</th>
                                    <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 600 }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allUsers.map((u: any) => (
                                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ fontWeight: 600 }}>{u.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{u.email}</div>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span className="badge" style={{
                                                background: u.role === 'admin' ? 'var(--primary-bg)' :
                                                    u.role === 'doctor' ? 'hsl(260, 80%, 95%)' :
                                                        u.role === 'nurse' ? 'hsl(180, 80%, 95%)' : 'var(--bg)',
                                                color: u.role === 'admin' ? 'var(--primary)' :
                                                    u.role === 'doctor' ? 'var(--secondary-dark)' :
                                                        u.role === 'nurse' ? '#088F8F' : 'var(--text-secondary)',
                                                textTransform: 'uppercase'
                                            }}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{u.phone}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                            <select
                                                className="form-select"
                                                style={{ minHeight: 32, padding: '4px 8px', fontSize: '0.75rem', width: 'auto' }}
                                                value={u.role}
                                                onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                                            >
                                                <option value="patient">Patient</option>
                                                <option value="nurse">Nurse</option>
                                                <option value="doctor">Doctor</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Audit Log */}
            {activeTab === 'audit' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {auditLogs.length === 0 ? (
                        <div className="empty-state"><Inbox size={48} className="empty-state-icon" /><p>No audit logs yet.</p></div>
                    ) : (
                        auditLogs.map((log) => (
                            <div key={log.id} style={{
                                display: 'flex', gap: 'var(--space-md)', alignItems: 'center',
                                padding: 'var(--space-sm) var(--space-md)', fontSize: '0.813rem',
                                borderBottom: '1px solid var(--border-light)'
                            }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', minWidth: 130 }}>
                                    {format(new Date(log.timestamp), 'MMM d, h:mm:ss a')}
                                </span>
                                <span style={{ fontWeight: 600 }}>{log.user?.name}</span>
                                <span className="badge badge-primary" style={{ fontSize: '0.688rem' }}>{log.actionType}</span>
                                <span style={{ color: 'var(--text-secondary)' }}>{log.entityType} #{log.entityId.slice(0, 8)}</span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
