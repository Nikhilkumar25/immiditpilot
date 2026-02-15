import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { serviceApi, labApi } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { Clock, User, MapPin, AlertCircle, FlaskConical, ChevronRight, Inbox, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const TRIAGE_COLORS: Record<string, string> = { mild: 'var(--success)', moderate: 'var(--warning)', severe: 'var(--critical)' };
const STATUS_LABELS: Record<string, string> = {
    nurse_assigned: 'Assigned', nurse_on_the_way: 'En Route', vitals_recorded: 'Vitals Done',
    awaiting_doctor_review: 'Awaiting Review', doctor_completed: 'Reviewed',
};

export default function NurseDashboard() {
    const [cases, setCases] = useState<any[]>([]);
    const [labTasks, setLabTasks] = useState<any[]>([]);
    const [stats, setStats] = useState({ completedToday: 0 });
    const [loading, setLoading] = useState(true);
    const { socket } = useSocket();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const fetchData = useCallback(async () => {
        try {
            const [casesRes, labRes, statsRes] = await Promise.all([
                serviceApi.getAssigned(),
                labApi.getNurseTasks(),
                serviceApi.getNurseStats(),
            ]);
            setCases(casesRes.data);
            setLabTasks(labRes.data);
            setStats(statsRes.data);
        } catch (err) { console.error(err); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        if (!socket) return;
        socket.on('nurse_assigned', () => { addToast('info', 'New case assigned!'); fetchData(); });
        socket.on('status_update', () => fetchData());
        return () => { socket.off('nurse_assigned'); socket.off('status_update'); };
    }, [socket, fetchData, addToast]);

    if (loading) return <div className="loading-page"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Nurse Dashboard</h1>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <p className="page-subtitle">{cases.length} active case{cases.length !== 1 ? 's' : ''} · {labTasks.length} lab task{labTasks.length !== 1 ? 's' : ''}</p>
                    <div className="badge" style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '6px 12px', borderRadius: '20px', fontSize: '0.875rem', fontWeight: 600 }}>
                        🏆 {stats.completedToday} Completed Today
                    </div>
                </div>
            </div>

            {/* Active Cases */}
            <section style={{ marginBottom: 'var(--space-xl)' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
                    📋 Assigned Cases
                </h2>
                {cases.length === 0 ? (
                    <div className="empty-state"><Inbox size={48} className="empty-state-icon" /><p>No assigned cases.</p></div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                        {cases.map((c) => {
                            const triage = c.clinicalReport?.triageLevel;
                            const isEmergency = c.serviceType === 'Emergency Assessment';
                            return (
                                <div key={c.id}
                                    className={`card case-card ${triage || ''}`}
                                    style={{
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        background: isEmergency ? 'hsl(0, 80%, 97%)' : undefined,
                                        borderLeft: isEmergency ? '4px solid #dc3545' : triage ? `4px solid ${TRIAGE_COLORS[triage]}` : undefined
                                    }}
                                    onClick={() => navigate(`/nurse/case/${c.id}`)}
                                >
                                    <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 'var(--radius-md)',
                                            background: isEmergency ? '#dc3545' : c.isImmediate ? 'var(--warning-bg, #fef3c7)' : 'var(--primary-bg)',
                                            display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', color: isEmergency ? 'white' : c.isImmediate ? 'var(--warning)' : 'var(--primary)', flexShrink: 0,
                                        }}>
                                            {isEmergency ? <AlertCircle size={20} /> : c.isImmediate ? <Zap size={18} /> : <User size={18} />}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {c.patient?.name}
                                                {isEmergency && <span className="badge" style={{ background: '#dc3545', color: 'white', fontSize: '0.625rem' }}>🚨 EMERGENCY</span>}
                                                {c.isImmediate && !isEmergency && (
                                                    <span className="badge badge-warning" style={{ fontSize: '0.625rem' }}>⚡ IMMEDIATE</span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: isEmergency ? '#dc3545' : 'var(--text-secondary)', fontWeight: isEmergency ? 600 : 400, marginTop: 2 }}>
                                                {c.serviceType}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 12px', marginTop: 4 }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <MapPin size={10} />
                                                    {c.savedAddress?.floor ? `Fl ${c.savedAddress.floor}, ` : ''}
                                                    {c.savedAddress?.buildingName ? `${c.savedAddress.buildingName}, ` : ''}
                                                    {c.location.split(',')[0]}
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Clock size={10} />
                                                    {formatDistanceToNow(new Date(c.scheduledTime), { addSuffix: true })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        {triage && (
                                            <span className={`badge badge-${triage}`}>{triage}</span>
                                        )}
                                        <span className="badge badge-primary">{STATUS_LABELS[c.status] || c.status.replace(/_/g, ' ')}</span>
                                        <ChevronRight size={18} color="var(--text-muted)" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Lab Tasks */}
            <section>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FlaskConical size={18} /> Lab Tasks
                </h2>
                {labTasks.length === 0 ? (
                    <div className="empty-state"><p>No pending lab tasks.</p></div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                        {labTasks.map((task) => (
                            <div key={task.id} className="card" style={{ borderLeft: '4px solid var(--secondary)', cursor: 'pointer' }}
                                onClick={() => navigate(`/nurse/case/${task.serviceId}`)}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{task.patient?.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            Tests: {(task.testsJson as any[])?.map((t: any) => t.name).join(', ')}
                                        </div>
                                    </div>
                                    <span className="badge badge-info">Sample Collection</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
