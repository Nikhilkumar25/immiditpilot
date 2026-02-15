import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { serviceApi, labApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import CaseTracker from '../components/CaseTracker';
import { Calendar, Plus, Clock, MapPin, ChevronRight, FileText, Inbox, XCircle, FlaskConical, Star } from 'lucide-react';
import { format } from 'date-fns';
import RatingDialog from '../components/RatingDialog';
import { ratingApi } from '../services/api';

const STATUS_LABELS: Record<string, string> = {
    pending_nurse_assignment: 'Pending Nurse',
    nurse_assigned: 'Nurse Assigned',
    nurse_on_the_way: 'Nurse En Route',
    vitals_recorded: 'Vitals Recorded',
    awaiting_doctor_review: 'Doctor Review',
    doctor_completed: 'Doctor Done',
    completed: 'Completed',
    cancelled: 'Cancelled',
};

const CANCELLABLE = ['pending_nurse_assignment', 'nurse_assigned'];

export default function PatientDashboard() {
    const [services, setServices] = useState<any[]>([]);
    const [labOrders, setLabOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [ratingConfig, setRatingConfig] = useState<{ isOpen: boolean; serviceId: string; toUserId: string; title: string, categories: string[] }>({
        isOpen: false, serviceId: '', toUserId: '', title: '', categories: []
    });
    const { user } = useAuth();
    const { socket } = useSocket();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const fetchData = useCallback(async () => {
        try {
            const [servRes, labRes] = await Promise.all([
                serviceApi.getMy(),
                labApi.getPatientOrders(user!.id),
            ]);
            setServices(servRes.data);
            setLabOrders(labRes.data);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Real-time updates
    useEffect(() => {
        if (!socket) return;
        const handler = (data: any) => {
            addToast('info', `Status updated: ${STATUS_LABELS[data.status] || data.status}`);
            fetchData();
        };
        socket.on('status_update', handler);
        socket.on('nurse_assigned', () => { addToast('success', 'A nurse has been assigned!'); fetchData(); });
        socket.on('prescription_uploaded', () => { addToast('success', 'Prescription uploaded!'); fetchData(); });
        socket.on('lab_order_created', () => { addToast('info', 'Lab test recommended'); fetchData(); });
        socket.on('report_uploaded', () => { addToast('success', 'Lab report is ready!'); fetchData(); });

        return () => { socket.off('status_update', handler); };
    }, [socket, fetchData, addToast]);

    const handleCancel = async (id: string) => {
        if (!confirm('Are you sure you want to cancel this visit?')) return;
        setCancelling(true);
        try {
            await serviceApi.cancel(id);
            addToast('success', 'Visit cancelled');
            fetchData();
        } catch (err: any) {
            addToast('error', err.response?.data?.error || 'Failed to cancel');
        } finally {
            setCancelling(false);
        }
    };

    const activeCase = services.find((s) => !['completed', 'cancelled'].includes(s.status));
    const history = services.filter((s) => ['completed', 'cancelled'].includes(s.status));
    const pendingLabs = labOrders.filter((l) => l.status === 'pending_patient_confirmation');

    if (loading) return <div className="loading-page"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
                <p className="page-subtitle">Track your medical visits and stay updated in real-time.</p>
            </div>

            {/* Active Case Tracker */}
            {activeCase && (
                <div style={{ marginBottom: 'var(--space-xl)' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="status-dot active" /> Active Case
                    </h2>
                    <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/patient/service/${activeCase.id}`)}>
                        <CaseTracker status={activeCase.status} />
                        <div style={{ marginTop: 'var(--space-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 600 }}>{activeCase.serviceType}</div>
                                <div style={{ fontSize: '0.813rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <MapPin size={12} /> {activeCase.location}
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {CANCELLABLE.includes(activeCase.status) && (
                                    <button
                                        className="btn btn-sm"
                                        style={{ color: 'var(--critical)', borderColor: 'var(--critical)', background: 'transparent' }}
                                        onClick={(e) => { e.stopPropagation(); handleCancel(activeCase.id); }}
                                        disabled={cancelling}
                                    >
                                        <XCircle size={14} /> {cancelling ? 'Cancelling...' : 'Cancel'}
                                    </button>
                                )}
                                <ChevronRight size={20} color="var(--text-muted)" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Pending Lab Confirmations */}
            {pendingLabs.length > 0 && (
                <div style={{ marginBottom: 'var(--space-xl)' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-md)' }}>⚠️ Lab Tests Awaiting Confirmation</h2>
                    {pendingLabs.map((lab) => (
                        <div key={lab.id} className="card" style={{ marginBottom: 'var(--space-sm)', borderLeft: '4px solid var(--warning)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{(lab.testsJson as any[])?.map((t: any) => t.name).join(', ')}</div>
                                    <div style={{ fontSize: '0.813rem', color: 'var(--text-secondary)' }}>Urgency: {lab.urgency}</div>
                                </div>
                                <button className="btn btn-primary btn-sm"
                                    onClick={async () => {
                                        try {
                                            await labApi.confirmOrder(lab.id);
                                            addToast('success', 'Lab order confirmed!');
                                            fetchData();
                                        } catch { addToast('error', 'Failed to confirm'); }
                                    }}>
                                    Confirm
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Lab Reports */}
            {labOrders.filter(l => l.status === 'report_ready').length > 0 && (
                <div style={{ marginBottom: 'var(--space-xl)' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FlaskConical size={18} /> Lab Reports
                    </h2>
                    {labOrders.filter(l => l.status === 'report_ready').map((lab) => (
                        <div key={lab.id} className="card" style={{ marginBottom: 'var(--space-sm)', borderLeft: '4px solid var(--primary)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{(lab.testsJson as any[])?.map((t: any) => t.name).join(', ')}</div>
                                    <div style={{ fontSize: '0.813rem', color: 'var(--text-secondary)' }}>Ready for your review</div>
                                </div>
                                <a
                                    href={lab.labReport?.reportUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary btn-sm"
                                >
                                    <FileText size={14} /> View Report
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Book Visit CTA */}
            {!activeCase && (
                <div style={{ marginBottom: 'var(--space-xl)' }}>
                    <button className="btn btn-primary btn-lg" onClick={() => navigate('/patient/book')}
                        style={{ gap: 'var(--space-sm)' }}>
                        <Plus size={20} /> Book a Medical Visit
                    </button>
                </div>
            )}

            {/* History */}
            <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={18} /> Visit History
                </h2>
                {history.length === 0 ? (
                    <div className="empty-state">
                        <Inbox size={48} className="empty-state-icon" />
                        <p>No previous visits yet.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                        {history.map((s) => (
                            <div key={s.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => navigate(`/patient/service/${s.id}`)}>
                                    <div style={{ fontWeight: 600 }}>{s.serviceType}</div>
                                    <div style={{ fontSize: '0.813rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Clock size={12} /> {format(new Date(s.createdAt), 'MMM d, yyyy')}
                                        <span className={`badge ${s.status === 'completed' ? 'badge-mild' : 'badge-severe'}`}>
                                            {s.status === 'completed' ? 'Completed' : 'Cancelled'}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    {s.status === 'completed' && (
                                        <>
                                            {s.nurseId && (
                                                <button
                                                    className="btn btn-ghost btn-xs"
                                                    style={{ gap: 4, height: 28, fontSize: '0.75rem' }}
                                                    onClick={() => setRatingConfig({
                                                        isOpen: true,
                                                        serviceId: s.id,
                                                        toUserId: s.nurseId,
                                                        title: `Rate Nurse: ${s.nurse?.name || 'Assigned Nurse'}`,
                                                        categories: ['Behavior', 'Punctuality', 'Medical Skill', 'Painless Treatment']
                                                    })}
                                                >
                                                    <Star size={12} /> Rate Nurse
                                                </button>
                                            )}
                                            {s.doctorId && (
                                                <button
                                                    className="btn btn-ghost btn-xs"
                                                    style={{ gap: 4, height: 28, fontSize: '0.75rem' }}
                                                    onClick={() => setRatingConfig({
                                                        isOpen: true,
                                                        serviceId: s.id,
                                                        toUserId: s.doctorId,
                                                        title: `Rate Doctor: ${s.doctor?.name || 'Reviewing Doctor'}`,
                                                        categories: ['Guidance', 'Diagnosis', 'Behaviour', 'Responsiveness']
                                                    })}
                                                >
                                                    <Star size={12} /> Rate Doctor
                                                </button>
                                            )}
                                        </>
                                    )}
                                    <ChevronRight size={20} color="var(--text-muted)" style={{ cursor: 'pointer' }} onClick={() => navigate(`/patient/service/${s.id}`)} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <RatingDialog
                isOpen={ratingConfig.isOpen}
                onClose={() => setRatingConfig({ ...ratingConfig, isOpen: false })}
                title={ratingConfig.title}
                categories={ratingConfig.categories}
                onSubmit={async (data) => {
                    try {
                        await ratingApi.submit({
                            serviceId: ratingConfig.serviceId,
                            toUserId: ratingConfig.toUserId,
                            ...data
                        });
                        addToast('success', 'Thank you for your feedback!');
                    } catch (err) {
                        addToast('error', 'Failed to submit rating');
                    }
                }}
            />
        </div>
    );
}
