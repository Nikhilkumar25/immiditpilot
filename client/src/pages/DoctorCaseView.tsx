import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { serviceApi, doctorApi, labApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, User, Send, Video, FlaskConical, FileText, Hospital, Calendar } from 'lucide-react';

export default function DoctorCaseView() {
    const { id } = useParams<{ id: string }>();
    const [service, setService] = useState<any>(null);
    const [labOrders, setLabOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const { user } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();

    // Doctor action form
    const [diagnosis, setDiagnosis] = useState('');
    const [labRecommended, setLabRecommended] = useState(false);
    const [referralNote, setReferralNote] = useState('');
    const [followupDate, setFollowupDate] = useState('');

    // Lab order form
    const [labTests, setLabTests] = useState('');
    const [labUrgency, setLabUrgency] = useState('routine');

    // Lab review
    const [reviewNotes, setReviewNotes] = useState('');

    const fetchData = useCallback(async () => {
        try {
            const servRes = await serviceApi.getById(id!);
            setService(servRes.data);
            if (servRes.data.labOrders) setLabOrders(servRes.data.labOrders);
        } catch (err) { console.error(err); }
        setLoading(false);
    }, [id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSubmitAction = async () => {
        if (!diagnosis.trim()) { addToast('error', 'Diagnosis is required'); return; }
        setSubmitting(true);
        try {
            await doctorApi.submitAction(id!, {
                diagnosis, labRecommended, referralNote: referralNote || undefined,
                followupDate: followupDate || undefined,
            });
            addToast('success', 'Diagnosis submitted!');

            // Create lab order if recommended
            if (labRecommended && labTests.trim()) {
                const tests = labTests.split(',').map((t) => ({ name: t.trim(), code: t.trim().toUpperCase().replace(/\s/g, '_') }));
                await labApi.createOrder({
                    serviceId: id, patientId: service.patientId, testsJson: tests, urgency: labUrgency,
                });
                addToast('success', 'Lab order created');
            }
            fetchData();
        } catch (err: any) {
            addToast('error', err.response?.data?.error || 'Failed');
        }
        setSubmitting(false);
    };

    const handleReviewLab = async (labOrderId: string) => {
        if (!reviewNotes.trim()) { addToast('error', 'Review notes required'); return; }
        try {
            await labApi.reviewReport(labOrderId, reviewNotes);
            addToast('success', 'Lab report reviewed');
            fetchData();
        } catch (err: any) { addToast('error', err.response?.data?.error || 'Failed'); }
    };

    if (loading) return <div className="loading-page"><div className="spinner" /></div>;
    if (!service) return <div className="empty-state"><p>Case not found.</p></div>;

    const report = service.clinicalReport;
    const existingAction = service.doctorAction;

    return (
        <div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/doctor')} style={{ marginBottom: 'var(--space-md)' }}>
                <ArrowLeft size={16} /> Back to Dashboard
            </button>

            {/* Patient info */}
            <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: '50%', background: 'var(--primary-bg)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)'
                    }}>
                        <User size={22} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{service.patient?.name}</h2>
                        <div style={{ fontSize: '0.813rem', color: 'var(--text-secondary)' }}>
                            {service.serviceType} · 📞 {service.patient?.phone}
                        </div>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                        {report?.triageLevel && <span className={`badge badge-${report.triageLevel}`}>{report.triageLevel}</span>}
                        <button className="btn btn-secondary btn-sm" onClick={() => addToast('info', 'Video call feature coming soon')}>
                            <Video size={14} /> Video Call
                        </button>
                    </div>
                </div>
                <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--bg)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
                    <strong>Symptoms:</strong> {service.symptoms}
                </div>
            </div>

            {/* Nurse Report */}
            {report && (
                <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileText size={18} /> Nurse Clinical Report
                    </h3>
                    <div className="vitals-grid" style={{ marginBottom: 'var(--space-md)' }}>
                        {Object.entries(report.vitalsJson || {}).map(([key, val]) => (
                            <div key={key} className="vital-card">
                                <div className="vital-value">{val as string || '–'}</div>
                                <div className="vital-label">{key.replace(/([A-Z])/g, ' $1')}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ fontSize: '0.875rem', marginBottom: 8 }}>
                        <strong>Nurse Notes:</strong> {report.nurseNotes}
                    </div>
                    <span className={`badge badge-${report.triageLevel}`}>{report.triageLevel} priority</span>
                </div>
            )}

            {/* Doctor Action Form */}
            {!existingAction && service.status === 'awaiting_doctor_review' && (
                <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>🩺 Your Assessment</h3>

                    <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
                        <label className="form-label">Diagnosis *</label>
                        <textarea className="form-textarea" placeholder="Write your diagnosis..."
                            value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label"><Hospital size={14} style={{ verticalAlign: 'middle' }} /> Referral Note</label>
                            <input type="text" className="form-input" placeholder="Hospital referral if needed"
                                value={referralNote} onChange={(e) => setReferralNote(e.target.value)} />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label"><Calendar size={14} style={{ verticalAlign: 'middle' }} /> Follow-up Date</label>
                            <input type="date" className="form-input"
                                value={followupDate} onChange={(e) => setFollowupDate(e.target.value)} />
                        </div>
                    </div>

                    {/* Lab Toggle */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
                        padding: 'var(--space-md)', background: 'var(--bg)', borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-lg)', cursor: 'pointer'
                    }} onClick={() => setLabRecommended(!labRecommended)}>
                        <div style={{
                            width: 44, height: 24, borderRadius: 12, position: 'relative',
                            background: labRecommended ? 'var(--primary)' : 'var(--border)', transition: 'var(--transition)'
                        }}>
                            <div style={{
                                width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute',
                                top: 2, left: labRecommended ? 22 : 2, transition: 'var(--transition)', boxShadow: 'var(--shadow-sm)',
                            }} />
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                            <FlaskConical size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            Recommend Lab Tests
                        </span>
                    </div>

                    {labRecommended && (
                        <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
                            <div className="form-group" style={{ flex: 2 }}>
                                <label className="form-label">Test Names (comma-separated)</label>
                                <input type="text" className="form-input" placeholder="CBC, Blood Sugar, Thyroid"
                                    value={labTests} onChange={(e) => setLabTests(e.target.value)} />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Urgency</label>
                                <select className="form-select" value={labUrgency} onChange={(e) => setLabUrgency(e.target.value)}>
                                    <option value="routine">Routine</option>
                                    <option value="urgent">Urgent</option>
                                    <option value="stat">STAT</option>
                                </select>
                            </div>
                        </div>
                    )}

                    <button className="btn btn-primary btn-lg btn-block" onClick={handleSubmitAction} disabled={submitting}>
                        {submitting ? <div className="spinner" /> : <><Send size={18} /> Submit Assessment</>}
                    </button>
                </div>
            )}

            {/* Existing Action */}
            {existingAction && (
                <div className="card" style={{ marginBottom: 'var(--space-lg)', borderLeft: '4px solid var(--success)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-md)' }}>✅ Your Assessment</h3>
                    <div style={{ fontSize: '0.875rem', marginBottom: 8 }}><strong>Diagnosis:</strong> {existingAction.diagnosis}</div>
                    {existingAction.referralNote && <div style={{ fontSize: '0.875rem', marginBottom: 8 }}><strong>Referral:</strong> {existingAction.referralNote}</div>}
                    {existingAction.followupDate && <div style={{ fontSize: '0.875rem', marginBottom: 8 }}><strong>Follow-up:</strong> {new Date(existingAction.followupDate).toLocaleDateString()}</div>}
                    {existingAction.labRecommended && <span className="badge badge-info">Lab Recommended</span>}
                </div>
            )}

            {/* Lab Orders */}
            {labOrders.length > 0 && (
                <div className="card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FlaskConical size={18} /> Lab Orders
                    </h3>
                    {labOrders.map((lo) => (
                        <div key={lo.id} style={{ padding: 'var(--space-md)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{(lo.testsJson as any[])?.map((t: any) => t.name).join(', ')}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Urgency: {lo.urgency}</div>
                                </div>
                                <span className="badge badge-primary">{lo.status.replace(/_/g, ' ')}</span>
                            </div>
                            {/* Review form for reports */}
                            {lo.labReport && !lo.labReport.doctorReviewNotes && (
                                <div style={{ marginTop: 8 }}>
                                    <a href={lo.labReport.reportUrl} target="_blank" rel="noopener" className="btn btn-secondary btn-sm" style={{ marginBottom: 8 }}>
                                        View Report
                                    </a>
                                    <div className="form-group" style={{ marginTop: 8 }}>
                                        <textarea className="form-textarea" placeholder="Your review notes..."
                                            style={{ minHeight: 60 }}
                                            value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} />
                                    </div>
                                    <button className="btn btn-success btn-sm" onClick={() => handleReviewLab(lo.id)}>
                                        Submit Review
                                    </button>
                                </div>
                            )}
                            {lo.labReport?.doctorReviewNotes && (
                                <div style={{ marginTop: 8, padding: 8, background: 'var(--success-bg)', borderRadius: 'var(--radius-sm)', fontSize: '0.813rem' }}>
                                    <strong>Review:</strong> {lo.labReport.doctorReviewNotes}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
