import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { serviceApi, doctorApi, labApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, User, Send, Video, FlaskConical, FileText, Hospital, Calendar, AlertTriangle, Star } from 'lucide-react';
import { getServiceFlowUI } from '../services/ServiceFlowConfig';
import RatingDialog from '../components/RatingDialog';
import { ratingApi } from '../services/api';

const EMERGENCY_ACTIONS = [
    { value: 'hospital_referral', label: '🏥 Hospital Referral', color: '#dc3545', description: 'Refer patient to hospital for emergency care' },
    { value: 'immediate_prescription', label: '💊 Immediate Prescription', color: '#fd7e14', description: 'Prescribe immediate medication' },
    { value: 'continue_care', label: '🏠 Continue Home Care', color: '#28a745', description: 'Continue monitoring with updated plan' },
];

export default function DoctorCaseView() {
    const { id } = useParams<{ id: string }>();
    const [service, setService] = useState<any>(null);
    const [labOrders, setLabOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [ratingConfig, setRatingConfig] = useState<{ isOpen: boolean; toUserId: string; title: string, categories: string[] }>({
        isOpen: false, toUserId: '', title: '', categories: []
    });
    const { user } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();

    // Doctor action form
    const [diagnosis, setDiagnosis] = useState('');
    const [labRecommended, setLabRecommended] = useState(false);
    const [referralNote, setReferralNote] = useState('');
    const [followupDate, setFollowupDate] = useState('');

    // Emergency-specific
    const [emergencyAction, setEmergencyAction] = useState('');
    const [hospitalReferral, setHospitalReferral] = useState('');
    const [immediatePrescription, setImmediatePrescription] = useState('');

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

    const flowUI = service ? getServiceFlowUI(service.serviceType) : null;

    const handleSubmitAction = async () => {
        if (!diagnosis.trim()) { addToast('error', 'Diagnosis is required'); return; }

        // Emergency validation
        if (flowUI?.isEmergency && !emergencyAction) {
            addToast('error', 'Emergency Assessment requires an explicit action');
            return;
        }

        setSubmitting(true);
        try {
            await doctorApi.submitAction(id!, {
                diagnosis,
                labRecommended,
                referralNote: referralNote || undefined,
                followupDate: followupDate || undefined,
                emergencyAction: flowUI?.isEmergency ? emergencyAction : undefined,
                hospitalReferral: emergencyAction === 'hospital_referral' ? hospitalReferral : undefined,
                immediatePrescription: emergencyAction === 'immediate_prescription' ? immediatePrescription : undefined,
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
    const vitalsJson = report?.vitalsJson || {};

    return (
        <div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/doctor')} style={{ marginBottom: 'var(--space-md)' }}>
                <ArrowLeft size={16} /> Back to Dashboard
            </button>

            {/* Emergency Alert Banner */}
            {flowUI?.isEmergency && (
                <div style={{
                    background: 'linear-gradient(135deg, #dc3545, #c82333)',
                    color: 'white',
                    padding: 'var(--space-md) var(--space-lg)',
                    borderRadius: 'var(--radius-lg)',
                    marginBottom: 'var(--space-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    fontWeight: 700,
                    fontSize: '0.925rem',
                    animation: 'pulse 2s infinite',
                    boxShadow: '0 4px 16px rgba(220, 53, 69, 0.4)',
                }}>
                    <AlertTriangle size={22} /> 🚨 EMERGENCY ASSESSMENT — Immediate Doctor Action Required
                </div>
            )}

            {/* Patient info */}
            <div className="card" style={{ marginBottom: 'var(--space-lg)', borderLeft: flowUI ? `4px solid ${flowUI.color}` : undefined }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: '50%', background: 'var(--primary-bg)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.5rem',
                    }}>
                        {flowUI?.icon || <User size={22} />}
                    </div>
                    <div style={{ flex: 1 }}>
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
                        {Object.entries(vitalsJson).map(([key, val]) => {
                            // Skip image data from grid display
                            if (typeof val === 'string' && val.startsWith('data:image')) return null;
                            return (
                                <div key={key} className="vital-card">
                                    <div className="vital-value">{typeof val === 'boolean' ? (val ? '✅' : '❌') : (val as string || '–')}</div>
                                    <div className="vital-label">{key.replace(/([A-Z])/g, ' $1')}</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Service-specific image review */}
                    {service.serviceType === 'Wound Dressing' && (
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                            <div style={{ fontSize: '0.813rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)', textTransform: 'uppercase' }}>
                                🩹 Wound Images — Before / After
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                                {vitalsJson.woundPhotoBefore && (
                                    <div style={{ textAlign: 'center' }}>
                                        <img src={vitalsJson.woundPhotoBefore} alt="Before" style={{ width: 200, height: 150, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '2px solid var(--warning)' }} />
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--warning)', marginTop: 4 }}>BEFORE</div>
                                    </div>
                                )}
                                {vitalsJson.woundPhotoAfter && (
                                    <div style={{ textAlign: 'center' }}>
                                        <img src={vitalsJson.woundPhotoAfter} alt="After" style={{ width: 200, height: 150, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '2px solid var(--success)' }} />
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success)', marginTop: 4 }}>AFTER</div>
                                    </div>
                                )}
                            </div>
                            {vitalsJson.healingStage && (
                                <div style={{ marginTop: 'var(--space-sm)', fontSize: '0.875rem' }}>
                                    <strong>Healing Stage:</strong> <span className="badge badge-info">{vitalsJson.healingStage}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Injection reaction status */}
                    {service.serviceType === 'Injection' && vitalsJson.reactionStatus && (
                        <div style={{
                            padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)',
                            background: vitalsJson.reactionStatus === 'none' ? 'hsl(145, 63%, 95%)' : 'hsl(0, 80%, 95%)',
                            border: `1px solid ${vitalsJson.reactionStatus === 'none' ? 'var(--success)' : 'var(--critical)'}`,
                        }}>
                            <strong>Reaction Status:</strong>{' '}
                            <span style={{
                                fontWeight: 700,
                                color: vitalsJson.reactionStatus === 'none' ? 'var(--success)' : 'var(--critical)',
                            }}>
                                {vitalsJson.reactionStatus.toUpperCase()}
                            </span>
                            {vitalsJson.reactionStatus === 'none' && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                                    ✅ No adverse reaction — case auto-closed
                                </div>
                            )}
                        </div>
                    )}

                    {/* IV Therapy infusion summary */}
                    {service.serviceType === 'IV Therapy' && (
                        <div style={{ padding: 'var(--space-md)', background: 'hsl(280, 60%, 96%)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)' }}>
                            <strong>💉 Infusion Summary:</strong>
                            <div style={{ fontSize: '0.875rem', marginTop: 4 }}>
                                Start: {vitalsJson.infusionStartTime || '–'} | End: {vitalsJson.infusionEndTime || 'In progress'}
                            </div>
                            {vitalsJson.prescriptionVerified && <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: 4 }}>✅ Prescription verified</div>}
                        </div>
                    )}

                    {/* Catheter Care infection risk */}
                    {service.serviceType === 'Catheter Care' && (
                        <div style={{
                            padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)',
                            background: vitalsJson.infectionSigns === 'none' ? 'hsl(145, 63%, 95%)' : 'hsl(0, 80%, 95%)',
                            border: `1px solid ${vitalsJson.infectionSigns === 'none' ? 'var(--success)' : 'var(--critical)'}`,
                        }}>
                            <strong>🔬 Infection Signs:</strong>{' '}
                            <span style={{ fontWeight: 700 }}>{(vitalsJson.infectionSigns || 'none').replace(/_/g, ' ')}</span>
                            <div style={{ fontSize: '0.875rem', marginTop: 4 }}>
                                Urine output: {vitalsJson.urineOutput || '–'} ml |
                                Catheter changed: {vitalsJson.catheterChanged ? '✅ Yes' : '❌ No'}
                            </div>
                        </div>
                    )}

                    {/* Post-Op site photos */}
                    {service.serviceType === 'Post-Operative Care' && (
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                            {(report.attachments || []).filter((a: string) => a.startsWith('data:image')).map((img: string, i: number) => (
                                <img key={i} src={img} alt={`Site ${i + 1}`}
                                    style={{ width: 200, height: 150, objectFit: 'cover', borderRadius: 'var(--radius-md)', marginRight: 8, border: '1px solid var(--border)' }} />
                            ))}
                            {vitalsJson.painLevel && (
                                <div style={{ marginTop: 'var(--space-sm)', fontSize: '0.875rem' }}>
                                    <strong>Pain Level:</strong> {vitalsJson.painLevel}/10
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ fontSize: '0.875rem', marginBottom: 8 }}>
                        <strong>Nurse Notes:</strong> {report.nurseNotes}
                    </div>
                    <span className={`badge badge-${report.triageLevel}`}>{report.triageLevel} priority</span>
                </div>
            )}

            {/* Doctor Action Form */}
            {!existingAction && service.status === 'awaiting_doctor_review' && (
                <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>
                        {flowUI?.icon || '🩺'} Your Assessment — {service.serviceType}
                    </h3>

                    {/* Emergency Action Selection (REQUIRED for Emergency Assessment) */}
                    {flowUI?.isEmergency && (
                        <div style={{ marginBottom: 'var(--space-lg)' }}>
                            <label className="form-label" style={{ color: '#dc3545', fontWeight: 700 }}>
                                🚨 Emergency Action Required *
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                                {EMERGENCY_ACTIONS.map((action) => (
                                    <div key={action.value}
                                        onClick={() => setEmergencyAction(action.value)}
                                        style={{
                                            padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                            border: `2px solid ${emergencyAction === action.value ? action.color : 'var(--border)'}`,
                                            background: emergencyAction === action.value ? `${action.color}10` : 'var(--bg)',
                                            transition: 'var(--transition)',
                                        }}>
                                        <div style={{ fontSize: '0.938rem', fontWeight: emergencyAction === action.value ? 700 : 500 }}>
                                            {action.label}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                                            {action.description}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Conditional fields based on emergency action */}
                            {emergencyAction === 'hospital_referral' && (
                                <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
                                    <label className="form-label">Hospital Referral Details *</label>
                                    <textarea className="form-textarea" placeholder="Hospital name, department, reason for referral..."
                                        value={hospitalReferral} onChange={(e) => setHospitalReferral(e.target.value)} />
                                </div>
                            )}
                            {emergencyAction === 'immediate_prescription' && (
                                <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
                                    <label className="form-label">Immediate Prescription Details *</label>
                                    <textarea className="form-textarea" placeholder="Medication, dosage, frequency, administration route..."
                                        value={immediatePrescription} onChange={(e) => setImmediatePrescription(e.target.value)} />
                                </div>
                            )}
                        </div>
                    )}

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

                    <button
                        className={`btn ${flowUI?.isEmergency ? 'btn-danger' : 'btn-primary'} btn-lg btn-block`}
                        onClick={handleSubmitAction}
                        disabled={submitting}
                        style={flowUI?.isEmergency ? {
                            background: 'linear-gradient(135deg, #dc3545, #c82333)',
                            boxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)',
                        } : {}}
                    >
                        {submitting ? <div className="spinner" /> : (
                            <>
                                <Send size={18} />
                                {flowUI?.isEmergency ? '🚨 Submit Emergency Assessment' : 'Submit Assessment'}
                            </>
                        )}
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
            {/* Feedback / Rating Section */}
            {service.status === 'completed' && (
                <div className="card" style={{ borderLeft: '4px solid var(--warning)', marginTop: 'var(--space-md)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Star size={18} /> Experience Feedback
                    </h3>
                    <p style={{ fontSize: '0.813rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
                        Please share your feedback to help us maintain high standards of care.
                    </p>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary btn-sm"
                            onClick={() => setRatingConfig({
                                isOpen: true,
                                toUserId: service.patientId,
                                title: `Rate Patient: ${service.patient?.name}`,
                                categories: ['Behaviour', 'Clarity of Symptoms', 'Cooperation']
                            })}>
                            Rate Patient
                        </button>
                        {service.nurseId && (
                            <button className="btn btn-secondary btn-sm"
                                onClick={() => setRatingConfig({
                                    isOpen: true,
                                    toUserId: service.nurseId,
                                    title: `Rate Nurse: ${service.nurse?.name}`,
                                    categories: ['Behaviour', 'Technical Skill', 'Punctuality', 'Diligence']
                                })}>
                                Rate Nurse
                            </button>
                        )}
                    </div>
                </div>
            )}

            <RatingDialog
                isOpen={ratingConfig.isOpen}
                onClose={() => setRatingConfig({ ...ratingConfig, isOpen: false })}
                title={ratingConfig.title}
                categories={ratingConfig.categories}
                onSubmit={async (data) => {
                    try {
                        await ratingApi.submit({
                            serviceId: service.id,
                            toUserId: ratingConfig.toUserId,
                            ...data
                        });
                        addToast('success', 'Feedback submitted successfully!');
                    } catch (err) {
                        addToast('error', 'Failed to submit feedback');
                    }
                }}
            />
        </div>
    );
}
