import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { serviceApi, labApi } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { Clock, User, ChevronRight, FlaskConical, Inbox, AlertTriangle, Stethoscope, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const TRIAGE_COLORS: Record<string, string> = {
    mild: 'var(--success)', moderate: 'var(--warning)', severe: 'var(--critical)'
};

export default function DoctorDashboard() {
    const [cases, setCases] = useState<any[]>([]);
    const [labReviews, setLabReviews] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('all');
    const [loading, setLoading] = useState(true);
    const { socket } = useSocket();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const fetchData = useCallback(async () => {
        try {
            const [casesRes, labRes] = await Promise.all([
                serviceApi.getPendingReview(),
                labApi.getDoctorReviews(),
            ]);
            setCases(casesRes.data);
            setLabReviews(labRes.data);
        } catch (err) { console.error(err); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        if (!socket) return;
        socket.on('vitals_submitted', () => { addToast('info', 'New vitals submitted for review'); fetchData(); });
        socket.on('report_uploaded', () => { addToast('info', 'New lab report ready for review'); fetchData(); });
        socket.on('status_update', () => fetchData());
        return () => { socket.off('vitals_submitted'); socket.off('report_uploaded'); };
    }, [socket, fetchData, addToast]);

    const filteredCases = cases.filter((c) => {
        if (activeTab === 'all') return true;
        if (activeTab === 'awaiting') return c.status === 'awaiting_doctor_review';
        const triage = c.clinicalReport?.triageLevel;
        return triage === activeTab;
    });

    const tabs = [
        { key: 'all', label: `All (${cases.length})` },
        { key: 'severe', label: `Severe` },
        { key: 'moderate', label: `Moderate` },
        { key: 'awaiting', label: `Awaiting Review` },
    ];

    if (loading) return <div className="loading-page"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Doctor Dashboard</h1>
                <p className="page-subtitle">{cases.filter(c => c.status === 'awaiting_doctor_review').length} cases awaiting your review</p>
            </div>

            {/* Tabs */}
            <div className="tabs">
                {tabs.map((tab) => (
                    <button key={tab.key}
                        className={`tab ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Cases */}
            <section style={{ marginBottom: 'var(--space-xl)' }}>
                {filteredCases.length === 0 ? (
                    <div className="empty-state"><Inbox size={48} className="empty-state-icon" /><p>No cases in this view.</p></div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                        {filteredCases.map((c) => {
                            const triage = c.clinicalReport?.triageLevel || 'mild';
                            const vitals = c.clinicalReport?.vitalsJson;
                            return (
                                <div key={c.id}
                                    className={`card case-card ${triage}`}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => navigate(`/doctor/case/${c.id}`)}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                                            <div style={{
                                                width: 44, height: 44, borderRadius: 'var(--radius-md)',
                                                background: `${TRIAGE_COLORS[triage]}15`, display: 'flex',
                                                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                            }}>
                                                {triage === 'severe' ? <AlertTriangle size={20} color={TRIAGE_COLORS[triage]} /> : <User size={20} color={TRIAGE_COLORS[triage]} />}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    {c.patient?.name}
                                                    <span className={`badge badge-${triage}`}>{triage}</span>
                                                    {c.isImmediate && <span className="badge badge-warning" style={{ fontSize: '0.625rem' }}><Zap size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> IMMEDIATE</span>}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                                                    {c.serviceCategory || 'Service'} · {c.serviceType}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                                                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                                                </div>
                                                {/* Vitals snapshot */}
                                                {vitals && (
                                                    <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 8, fontSize: '0.75rem' }}>
                                                        <span>BP: <strong>{vitals.bloodPressure || '–'}</strong></span>
                                                        <span>Pulse: <strong>{vitals.pulse || '–'}</strong></span>
                                                        <span>Temp: <strong>{vitals.temperature || '–'}°C</strong></span>
                                                        <span>SpO₂: <strong>{vitals.spO2 || '–'}%</strong></span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            {c.status === 'awaiting_doctor_review' && (
                                                <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/doctor/case/${c.id}`); }}>
                                                    <Stethoscope size={14} /> Review
                                                </button>
                                            )}
                                            <ChevronRight size={18} color="var(--text-muted)" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Lab Reviews */}
            {labReviews.length > 0 && (
                <section>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FlaskConical size={18} /> Lab Reports to Review ({labReviews.length})
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                        {labReviews.map((lr) => (
                            <div key={lr.id} className="card" style={{ borderLeft: '4px solid var(--secondary)', cursor: 'pointer' }}
                                onClick={() => navigate(`/doctor/case/${lr.serviceId}`)}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{lr.patient?.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {(lr.testsJson as any[])?.map((t: any) => t.name).join(', ')}
                                        </div>
                                    </div>
                                    <span className="badge badge-info">{lr.status === 'report_ready' ? 'Report Ready' : 'Pending Review'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
