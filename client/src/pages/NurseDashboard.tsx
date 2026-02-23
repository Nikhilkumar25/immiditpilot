import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { serviceApi, labApi } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { Clock, User, MapPin, AlertCircle, FlaskConical, ChevronRight, Inbox, Zap, Siren } from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState<'cases' | 'samples'>('cases');
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
            <div className="page-header" style={{ marginBottom: 'var(--space-lg)' }}>
                <h1 className="page-title">Dashboard</h1>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
                    <p className="page-subtitle" style={{ fontSize: '0.875rem' }}>{cases.length} active case{cases.length !== 1 ? 's' : ''} · {labTasks.length} lab task{labTasks.length !== 1 ? 's' : ''}</p>
                    <div className="badge w-full-mobile" style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, alignSelf: 'flex-start', display: 'flex', justifyContent: 'center' }}>
                        🏆 {stats.completedToday} Completed Today
                    </div>
                </div>
            </div>

            {/* Tabbed Navigation */}
            <div className="tabs" style={{ marginBottom: 'var(--space-lg)' }}>
                <button
                    className={`tab ${activeTab === 'cases' ? 'active' : ''}`}
                    onClick={() => setActiveTab('cases')}
                    style={{ flex: 1, position: 'relative' }}
                >
                    Assigned Cases
                    {cases.length > 0 && <span className="tab-badge">{cases.length}</span>}
                </button>
                <button
                    className={`tab ${activeTab === 'samples' ? 'active' : ''}`}
                    onClick={() => setActiveTab('samples')}
                    style={{ flex: 1, position: 'relative' }}
                >
                    Sample Collections
                    {labTasks.length > 0 && <span className="tab-badge" style={{ background: 'var(--secondary)' }}>{labTasks.length}</span>}
                </button>
            </div>

            {/* Tab Content */}
            <div className="animate-in">
                {activeTab === 'cases' ? (
                    <section>
                        {cases.length === 0 ? (
                            <div className="empty-state"><Inbox size={48} className="empty-state-icon" /><p>No assigned cases.</p></div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                                {cases.map((c) => {
                                    const triage = c.clinicalReport?.triageLevel;
                                    const isEmergency = c.serviceType === 'Emergency Assessment';
                                    return (
                                        <div key={c.id}
                                            className={`card case-card ${triage || ''} flex-col-mobile`}
                                            style={{
                                                cursor: 'pointer',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                gap: 'var(--space-sm)',
                                                background: isEmergency ? 'hsl(0, 80%, 97%)' : undefined,
                                                borderLeft: isEmergency ? '4px solid #dc3545' : triage ? `4px solid ${TRIAGE_COLORS[triage]}` : undefined
                                            }}
                                            onClick={() => navigate(`/nurse/case/${c.id}`)}
                                        >
                                            <div className="w-full-mobile" style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                                                <div style={{
                                                    width: 40, height: 40, borderRadius: 'var(--radius-md)',
                                                    background: isEmergency ? '#dc3545' : c.isImmediate ? 'var(--warning-bg, #fef3c7)' : 'var(--primary-bg)',
                                                    display: 'flex', alignItems: 'center',
                                                    justifyContent: 'center', color: isEmergency ? 'white' : c.isImmediate ? 'var(--warning)' : 'var(--primary)', flexShrink: 0,
                                                }}>
                                                    {isEmergency ? <AlertCircle size={20} /> : c.isImmediate ? <Zap size={18} /> : <User size={18} />}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                        {c.patient?.name}
                                                        {isEmergency && <span className="badge" style={{ background: '#dc3545', color: 'white', fontSize: '0.625rem' }}><Siren size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> EMERGENCY</span>}
                                                        {c.isImmediate && !isEmergency && (
                                                            <span className="badge badge-warning" style={{ fontSize: '0.625rem' }}><Zap size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> IMMEDIATE</span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: isEmergency ? '#dc3545' : 'var(--text-secondary)', fontWeight: isEmergency ? 600 : 400, marginTop: 2 }}>
                                                        {c.serviceType}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 12px', marginTop: 4 }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <span style={{ flexShrink: 0 }}><MapPin size={10} /></span>
                                                            <span>
                                                                {c.savedAddress?.floor ? `Fl ${c.savedAddress.floor}, ` : ''}
                                                                {c.savedAddress?.buildingName ? `${c.savedAddress.buildingName}, ` : ''}
                                                                {c.location.split(',')[0]}
                                                            </span>
                                                        </span>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <span style={{ flexShrink: 0 }}><Clock size={10} /></span>
                                                            {formatDistanceToNow(new Date(c.scheduledTime), { addSuffix: true })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="w-full-mobile" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-sm)', flexShrink: 0, width: '100%', marginTop: 'auto' }}>
                                                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                                    {triage && (
                                                        <span className={`badge badge-${triage}`} style={{ fontSize: '0.625rem' }}>{triage}</span>
                                                    )}
                                                    <span className="badge badge-primary desktop-only">{STATUS_LABELS[c.status] || c.status.replace(/_/g, ' ')}</span>
                                                    <span className="badge badge-primary mobile-only" style={{ fontSize: '0.7rem' }}>{STATUS_LABELS[c.status] || c.status.replace(/_/g, ' ')}</span>
                                                </div>
                                                <ChevronRight size={18} color="var(--text-muted)" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                ) : (
                    <section>
                        {labTasks.length === 0 ? (
                            <div className="empty-state"><FlaskConical size={48} className="empty-state-icon" /><p>No pending lab tasks.</p></div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                                {labTasks.map((task) => (
                                    <div key={task.id} className="card flex-col-mobile" style={{ borderLeft: '4px solid var(--secondary)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-sm)' }}
                                        onClick={() => navigate(`/nurse/case/${task.serviceId}`)}>
                                        <div className="w-full-mobile" style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                                            <div style={{
                                                width: 40, height: 40, borderRadius: 'var(--radius-md)',
                                                background: 'var(--secondary-light)',
                                                display: 'flex', alignItems: 'center',
                                                justifyContent: 'center', color: 'var(--secondary-dark)', flexShrink: 0,
                                            }}>
                                                <FlaskConical size={18} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600 }}>{task.patient?.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', wordBreak: 'break-word' }}>
                                                    Tests: {(task.testsJson as any[])?.map((t: any) => t.name).join(', ')}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <span style={{ flexShrink: 0 }}><MapPin size={10} /></span> {task.serviceRequest?.location.split(',')[0] || 'Unknown location'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-full-mobile" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-sm)', flexShrink: 0, width: '100%' }}>
                                            <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>Sample Needed</span>
                                            <ChevronRight size={18} color="var(--text-muted)" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
}
