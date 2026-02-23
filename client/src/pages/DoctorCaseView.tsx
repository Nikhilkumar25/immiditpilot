import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { serviceApi, doctorApi, labApi, prescriptionApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, User, Send, Check, Video, FlaskConical, FileText, Hospital, Calendar, AlertTriangle, Star, Plus, Trash2, Download, Pill, Search, X } from 'lucide-react';
import { getServiceFlowUI } from '../services/ServiceFlowConfig';
import { generatePrescriptionPDF } from '../services/prescriptionPdf';
import RatingDialog from '../components/RatingDialog';
import VideoCall from '../components/VideoCall';
import { ratingApi } from '../services/api';
import { useSocket } from '../context/SocketContext';

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
    const { socket } = useSocket();
    const navigate = useNavigate();

    // Video call state
    const [showVideoCall, setShowVideoCall] = useState(false);

    // Doctor action form
    const [diagnosis, setDiagnosis] = useState('');
    const [clinicalNotes, setClinicalNotes] = useState('');
    const [advice, setAdvice] = useState('');
    const [medications, setMedications] = useState('');
    const [labRecommended, setLabRecommended] = useState(false);
    const [referralNote, setReferralNote] = useState('');
    const [followupDate, setFollowupDate] = useState('');
    const [followupInstruction, setFollowupInstruction] = useState('');

    // Clinical History (shifted from nurse)
    const [chiefComplaint, setChiefComplaint] = useState('');
    const [durationOfSymptoms, setDurationOfSymptoms] = useState('');
    const [medicalHistory, setMedicalHistory] = useState('');
    const [allergies, setAllergies] = useState('');
    const [currentMedications, setCurrentMedications] = useState('');

    // Structured medicines
    const [medicines, setMedicines] = useState<Array<{
        name: string; dosage: string; frequency: string;
        durationDays: number; timing: string; instructions: string;
    }>>([{ name: '', dosage: '', frequency: '1-0-1', durationDays: 5, timing: 'After Food', instructions: '' }]);

    // Prescription state
    const [prescription, setPrescription] = useState<any>(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);

    // Emergency-specific
    const [emergencyAction, setEmergencyAction] = useState('');
    const [hospitalReferral, setHospitalReferral] = useState('');
    const [immediatePrescription, setImmediatePrescription] = useState('');

    // Lab order form
    const [availableTests, setAvailableTests] = useState<any[]>([]);
    const [selectedTests, setSelectedTests] = useState<any[]>([]);
    const [labSearchQuery, setLabSearchQuery] = useState('');
    const [labDropdownOpen, setLabDropdownOpen] = useState(false);
    const [labUrgency, setLabUrgency] = useState('routine');

    // Lab review
    const [reviewNotes, setReviewNotes] = useState('');

    const fetchData = useCallback(async () => {
        try {
            const servRes = await serviceApi.getById(id!);
            setService(servRes.data);
            if (servRes.data.labOrders) setLabOrders(servRes.data.labOrders);

            // Fetch available lab tests for dropdown
            try {
                const testsRes = await labApi.getAvailableTests();
                setAvailableTests(testsRes.data);
            } catch { /* non-critical */ }
            // Fetch prescription if exists
            if (servRes.data.doctorAction) {
                const action = servRes.data.doctorAction;
                setDiagnosis(action.diagnosis || '');
                setAdvice(action.advice || '');
                setClinicalNotes(action.clinicalNotes || '');
                setMedications(action.medications || '');
            }
            if (servRes.data.clinicalReport) {
                const report = servRes.data.clinicalReport;
                setChiefComplaint(report.chiefComplaint || '');
                setDurationOfSymptoms(report.durationOfSymptoms || '');
                setMedicalHistory(report.medicalHistory || '');
                setAllergies(report.allergies || '');
                setCurrentMedications(report.currentMedications || '');
            }
            // Try to fetch prescription separately
            try {
                const prescRes = await prescriptionApi.get(id!);
                setPrescription(prescRes.data);
            } catch { /* no prescription yet */ }
        } catch (err) {
            console.error(err);
        }
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
            // Filter out empty medicines
            const validMeds = medicines.filter(m => m.name.trim());

            await doctorApi.submitAction(id!, {
                diagnosis,
                clinicalNotes: clinicalNotes || undefined,
                advice: advice || undefined,
                medications: medications || undefined,
                medicinesJson: validMeds.length > 0 ? validMeds : undefined,
                labRecommended,
                referralNote: referralNote || undefined,
                followupDate: followupDate || undefined,
                followupInstruction: followupInstruction || undefined,
                emergencyAction: flowUI?.isEmergency ? emergencyAction : undefined,
                hospitalReferral: emergencyAction === 'hospital_referral' ? hospitalReferral : undefined,
                immediatePrescription: emergencyAction === 'immediate_prescription' ? immediatePrescription : undefined,
                // Include History
                chiefComplaint: chiefComplaint || undefined,
                durationOfSymptoms: durationOfSymptoms || undefined,
                medicalHistory: medicalHistory || undefined,
                allergies: allergies || undefined,
                currentMedications: currentMedications || undefined,
            });
            addToast('success', 'Diagnosis submitted!');

            // Create lab order if recommended
            if (labRecommended && selectedTests.length > 0) {
                const tests = selectedTests.map((t) => ({ testId: t.id, name: t.name, price: t.price, category: t.category }));
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

    const handleApproveProcedure = async (notes?: string) => {
        setSubmitting(true);
        try {
            await doctorApi.approveProcedure(id!, {
                notes,
                chiefComplaint: chiefComplaint || undefined,
                durationOfSymptoms: durationOfSymptoms || undefined,
                medicalHistory: medicalHistory || undefined,
                allergies: allergies || undefined,
                currentMedications: currentMedications || undefined,
            });
            addToast('success', 'Procedure approved! Nurse can now proceed.');
            fetchData();
        } catch (err: any) {
            addToast('error', err.response?.data?.error || 'Failed to approve');
        }
        setSubmitting(false);
    };

    const handleRequestEdit = async (notes?: string) => {
        if (!notes) { addToast('error', 'Please provide notes on what needs to be edited'); return; }
        setSubmitting(true);
        try {
            await doctorApi.requestEdit(id!, notes);
            addToast('warning', 'Edit request sent to nurse');
            fetchData();
        } catch (err: any) {
            addToast('error', err.response?.data?.error || 'Failed to send request');
        }
        setSubmitting(false);
    };

    // ============ STRUCTURED MEDICINE HELPERS ============
    const addMedicine = () => {
        setMedicines([...medicines, { name: '', dosage: '', frequency: '1-0-1', durationDays: 5, timing: 'After Food', instructions: '' }]);
    };
    const removeMedicine = (idx: number) => {
        setMedicines(medicines.filter((_, i) => i !== idx));
    };
    const updateMedicine = (idx: number, field: string, value: any) => {
        setMedicines(medicines.map((m, i) => i === idx ? { ...m, [field]: value } : m));
    };

    // ============ GENERATE PRESCRIPTION ============
    const handleGeneratePrescription = async () => {
        const validMeds = medicines.filter(m => m.name.trim());
        if (validMeds.length === 0) {
            addToast('error', 'Add at least one medicine before generating prescription');
            return;
        }
        if (!diagnosis.trim() && !existingAction?.diagnosis) {
            addToast('error', 'Diagnosis is required for prescription');
            return;
        }
        setGeneratingPdf(true);
        try {
            const result = await prescriptionApi.generate(id!, {
                diagnosis: existingAction?.diagnosis || diagnosis,
                summaryNotes: clinicalNotes || advice || undefined,
                medicinesJson: validMeds,
                followUpInstruction: followupInstruction || existingAction?.followupInstruction || undefined,
            });
            setPrescription(result.data);
            addToast('success', 'Prescription generated successfully!');
            fetchData();
        } catch (err: any) {
            addToast('error', err.response?.data?.error || 'Failed to generate prescription');
        }
        setGeneratingPdf(false);
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
                        {service.nurseId && (
                            <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                                onClick={() => setShowVideoCall(true)}>
                                <Video size={14} /> Video Call
                            </button>
                        )}
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

                    {/* Enriched Clinical Data Display */}
                    {(report.chiefComplaint || report.medicalHistory || report.allergies) && (
                        <div style={{ background: 'var(--bg)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', border: '1px solid var(--border)' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.813rem', marginBottom: 'var(--space-sm)', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                Enriched Clinical History
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
                                {report.chiefComplaint && <div><small style={{ color: 'var(--text-secondary)' }}>Chief Complaint</small><div>{report.chiefComplaint}</div></div>}
                                {report.durationOfSymptoms && <div><small style={{ color: 'var(--text-secondary)' }}>Duration</small><div>{report.durationOfSymptoms}</div></div>}
                                {report.medicalHistory && <div><small style={{ color: 'var(--text-secondary)' }}>Medical History</small><div>{report.medicalHistory}</div></div>}
                                {report.allergies && <div><small style={{ color: 'var(--text-secondary)' }}>Allergies</small><div>{report.allergies}</div></div>}
                                {report.currentMedications && <div style={{ gridColumn: '1 / -1' }}><small style={{ color: 'var(--text-secondary)' }}>Current Medications</small><div>{report.currentMedications}</div></div>}
                            </div>
                        </div>
                    )}

                    {/* Prescription Verification (for restricted services) / Request from Doctor */}
                    {vitalsJson.prescriptionStatus === 'Missing (Request from Doctor)' ? (
                        <div style={{
                            padding: 'var(--space-md)',
                            background: 'hsl(174, 62%, 95%)',
                            border: '1px solid var(--primary)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--space-md)',
                            display: 'flex',
                            gap: 12,
                            alignItems: 'center'
                        }}>
                            <div style={{ width: 40, height: 40, background: 'var(--primary-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <AlertTriangle size={20} color="var(--primary)" />
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.875rem' }}>PRESCRIPTION REQUESTED</div>
                                <div style={{ fontSize: '0.813rem', color: 'var(--text-secondary)' }}>
                                    Nurse reports no prescription available. Please review symptoms and issue a new prescription (₹199 fee).
                                </div>
                            </div>
                        </div>
                    ) : vitalsJson.prescriptionPhoto && (
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                            <div style={{ fontSize: '0.813rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)', textTransform: 'uppercase' }}>
                                📄 Uploaded Prescription from Patient
                            </div>
                            <img src={vitalsJson.prescriptionPhoto as string} alt="Prescription"
                                style={{ maxWidth: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', cursor: 'zoom-in' }}
                                onClick={() => window.open(vitalsJson.prescriptionPhoto as string, '_blank')} />
                        </div>
                    )}

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
                        <strong>Nurse Assessment Notes:</strong> {report.nurseNotes}
                    </div>
                    <span className={`badge badge-${report.triageLevel}`}>{report.triageLevel} priority</span>
                </div>
            )}

            {/* ============ PROCEDURE APPROVAL UI (Intermediate Step) ============ */}
            {service.status === 'awaiting_doctor_approval' && !existingAction?.procedureApproved && (
                <div className="card" style={{ marginBottom: 'var(--space-lg)', border: '2px solid var(--primary)', background: 'hsl(174, 62%, 98%)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Pill size={20} color="var(--primary)" />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Procedure Approval Required</h3>
                            <div style={{ fontSize: '0.813rem', color: 'var(--text-secondary)' }}>Confirm prescription and clinical status for {service.serviceType}</div>
                        </div>
                    </div>

                    {/* ============ CLINICAL HISTORY (Doctor fills) ============ */}
                    <div style={{ background: 'hsl(210, 80%, 98%)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', border: '1px solid hsl(210, 80%, 85%)' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FileText size={18} /> Patient Clinical History
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Chief Complaint *</label>
                                <input type="text" className="form-input" placeholder="Main symptom"
                                    value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Duration</label>
                                <input type="text" className="form-input" placeholder="e.g. 2 days"
                                    value={durationOfSymptoms} onChange={(e) => setDurationOfSymptoms(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Medical History</label>
                                <input type="text" className="form-input" placeholder="Asthma, Diabetes etc."
                                    value={medicalHistory} onChange={(e) => setMedicalHistory(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Allergies</label>
                                <input type="text" className="form-input" placeholder="Penicillin, Peanuts etc."
                                    value={allergies} onChange={(e) => setAllergies(e.target.value)} />
                            </div>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Current Medications</label>
                                <input type="text" className="form-input" placeholder="Any ongoing medication"
                                    value={currentMedications} onChange={(e) => setCurrentMedications(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                        <label className="form-label">Approval / Instructions Notes</label>
                        <textarea className="form-textarea" placeholder="Provide notes for the nurse or special instructions for the procedure..."
                            value={advice} onChange={(e) => setAdvice(e.target.value)} />
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                        <button className="btn btn-primary lg" style={{ flex: 1 }} onClick={() => handleApproveProcedure(advice)} disabled={submitting}>
                            {submitting ? <div className="spinner" /> : <><Check size={18} /> Approve Procedure</>}
                        </button>
                        <button className="btn btn-secondary lg" onClick={() => handleRequestEdit(advice)} disabled={submitting}>
                            <AlertTriangle size={18} /> Request Edit
                        </button>
                    </div>
                </div>
            )}

            {/* Approved Wait State */}
            {existingAction?.procedureApproved && service.status === 'awaiting_doctor_approval' && (
                <div className="card" style={{ marginBottom: 'var(--space-lg)', textAlign: 'center', padding: 'var(--space-xl) var(--space-md)', background: 'hsl(145, 63%, 98%)', border: '2px dashed var(--success)' }}>
                    <div style={{ width: 64, height: 64, background: 'hsl(145, 63%, 90%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-md)' }}>
                        <Check size={32} color="var(--success)" />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)', marginBottom: 'var(--space-sm)' }}>Procedure Approved</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto' }}>
                        Waiting for the nurse to perform and record the {service.serviceType} procedure.
                    </p>
                    <button className="btn btn-secondary btn-sm" onClick={fetchData} style={{ marginTop: 'var(--space-lg)' }}>
                        Refresh Case
                    </button>
                </div>
            )}

            {/* Doctor Action Form (Final Assessment) */}
            {(!existingAction?.id || (existingAction.procedureApproved && service.status === 'awaiting_doctor_review')) && (
                <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>
                        {flowUI?.icon || '🩺'} Your Final Assessment — {service.serviceType}
                    </h3>

                    {/* ============ CLINICAL HISTORY (Doctor fills) ============ */}
                    <div style={{ background: 'hsl(210, 80%, 98%)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', border: '1px solid hsl(210, 80%, 85%)' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FileText size={18} /> Patient Clinical History
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Chief Complaint *</label>
                                <input type="text" className="form-input" placeholder="Main symptom"
                                    value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Duration</label>
                                <input type="text" className="form-input" placeholder="e.g. 2 days"
                                    value={durationOfSymptoms} onChange={(e) => setDurationOfSymptoms(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Medical History</label>
                                <input type="text" className="form-input" placeholder="Asthma, Diabetes etc."
                                    value={medicalHistory} onChange={(e) => setMedicalHistory(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Allergies</label>
                                <input type="text" className="form-input" placeholder="Penicillin, Peanuts etc."
                                    value={allergies} onChange={(e) => setAllergies(e.target.value)} />
                            </div>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Current Medications</label>
                                <input type="text" className="form-input" placeholder="Any ongoing medication"
                                    value={currentMedications} onChange={(e) => setCurrentMedications(e.target.value)} />
                            </div>
                        </div>
                    </div>

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

                    <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                        <label className="form-label">Diagnosis *</label>
                        <textarea className="form-textarea" placeholder="Write your diagnosis..."
                            value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
                    </div>

                    <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                        <label className="form-label">Advice</label>
                        <textarea className="form-textarea" placeholder="Medical advice for the patient..."
                            value={advice} onChange={(e) => setAdvice(e.target.value)} />
                    </div>

                    <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                        <label className="form-label">Clinical Notes</label>
                        <textarea className="form-textarea" placeholder="Additional clinical observations..."
                            value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} />
                    </div>

                    {/* ============ STRUCTURED MEDICINES ============ */}
                    <div style={{ marginBottom: 'var(--space-lg)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                            <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Pill size={16} /> Medications (Structured)
                            </label>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={addMedicine} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Plus size={14} /> Add
                            </button>
                        </div>
                        {medicines.map((med, idx) => (
                            <div key={idx} style={{
                                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 80px 1fr 1fr auto',
                                gap: 8, marginBottom: 8, alignItems: 'end',
                            }}>
                                <div>
                                    {idx === 0 && <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 2 }}>Medicine *</div>}
                                    <input type="text" className="form-input" placeholder="Medicine name" style={{ padding: '8px', fontSize: '0.813rem' }}
                                        value={med.name} onChange={(e) => updateMedicine(idx, 'name', e.target.value)} />
                                </div>
                                <div>
                                    {idx === 0 && <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 2 }}>Dosage *</div>}
                                    <input type="text" className="form-input" placeholder="500mg" style={{ padding: '8px', fontSize: '0.813rem' }}
                                        value={med.dosage} onChange={(e) => updateMedicine(idx, 'dosage', e.target.value)} />
                                </div>
                                <div>
                                    {idx === 0 && <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 2 }}>Frequency</div>}
                                    <select className="form-select" style={{ padding: '8px', fontSize: '0.813rem' }}
                                        value={med.frequency} onChange={(e) => updateMedicine(idx, 'frequency', e.target.value)}>
                                        <option value="1-0-0">1-0-0</option>
                                        <option value="0-0-1">0-0-1</option>
                                        <option value="1-0-1">1-0-1</option>
                                        <option value="1-1-1">1-1-1</option>
                                        <option value="0-1-0">0-1-0</option>
                                        <option value="SOS">SOS</option>
                                    </select>
                                </div>
                                <div>
                                    {idx === 0 && <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 2 }}>Days</div>}
                                    <input type="number" className="form-input" min={1} style={{ padding: '8px', fontSize: '0.813rem' }}
                                        value={med.durationDays} onChange={(e) => updateMedicine(idx, 'durationDays', parseInt(e.target.value) || 1)} />
                                </div>
                                <div>
                                    {idx === 0 && <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 2 }}>Timing</div>}
                                    <select className="form-select" style={{ padding: '8px', fontSize: '0.813rem' }}
                                        value={med.timing} onChange={(e) => updateMedicine(idx, 'timing', e.target.value)}>
                                        <option value="Before Food">Before Food</option>
                                        <option value="After Food">After Food</option>
                                        <option value="None">None</option>
                                    </select>
                                </div>
                                <div>
                                    {idx === 0 && <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 2 }}>Instructions</div>}
                                    <input type="text" className="form-input" placeholder="e.g. with warm water" style={{ padding: '8px', fontSize: '0.813rem' }}
                                        value={med.instructions} onChange={(e) => updateMedicine(idx, 'instructions', e.target.value)} />
                                </div>
                                <button type="button" onClick={() => removeMedicine(idx)} style={{
                                    background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', padding: 4,
                                }}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Legacy free-text medications (optional) */}
                    <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Additional Medication Notes (optional free-text)</label>
                        <textarea className="form-textarea" placeholder="Additional notes about medications..." style={{ minHeight: 50 }}
                            value={medications} onChange={(e) => setMedications(e.target.value)} />
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
                    <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
                        <label className="form-label">Follow-up Instruction</label>
                        <input type="text" className="form-input" placeholder="e.g. Revisit in 5 days for wound check"
                            value={followupInstruction} onChange={(e) => setFollowupInstruction(e.target.value)} />
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
                        <div style={{ marginBottom: 'var(--space-lg)' }}>
                            {/* Search + Dropdown */}
                            <div style={{ position: 'relative', marginBottom: 'var(--space-md)' }}>
                                <label className="form-label">Search & Select Lab Tests</label>
                                <div style={{ position: 'relative' }}>
                                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Search tests (e.g. CBC, Thyroid, Blood Sugar)..."
                                        value={labSearchQuery}
                                        onChange={(e) => { setLabSearchQuery(e.target.value); setLabDropdownOpen(true); }}
                                        onFocus={() => setLabDropdownOpen(true)}
                                        style={{ paddingLeft: 36 }}
                                    />
                                </div>
                                {labDropdownOpen && (
                                    <div style={{
                                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                                        maxHeight: 250, overflowY: 'auto', marginTop: 4,
                                    }}>
                                        {(() => {
                                            const filtered = availableTests.filter(t =>
                                                !selectedTests.some(s => s.id === t.id) &&
                                                (t.name.toLowerCase().includes(labSearchQuery.toLowerCase()) ||
                                                    t.category.toLowerCase().includes(labSearchQuery.toLowerCase()))
                                            );
                                            if (filtered.length === 0) return (
                                                <div style={{ padding: 'var(--space-md)', textAlign: 'center', fontSize: '0.813rem', color: 'var(--text-secondary)' }}>
                                                    {availableTests.length === 0 ? 'Loading tests...' : 'No matching tests'}
                                                </div>
                                            );
                                            // Group by category
                                            const grouped: Record<string, any[]> = {};
                                            filtered.forEach(t => {
                                                if (!grouped[t.category]) grouped[t.category] = [];
                                                grouped[t.category].push(t);
                                            });
                                            return Object.entries(grouped).map(([cat, tests]) => (
                                                <div key={cat}>
                                                    <div style={{ padding: '6px 12px', fontSize: '0.688rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', background: 'var(--bg)', letterSpacing: '0.05em' }}>
                                                        {cat}
                                                    </div>
                                                    {tests.map(t => (
                                                        <div key={t.id}
                                                            onClick={() => {
                                                                setSelectedTests(prev => [...prev, t]);
                                                                setLabSearchQuery('');
                                                                setLabDropdownOpen(false);
                                                            }}
                                                            style={{
                                                                padding: '10px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                borderBottom: '1px solid var(--border)', transition: 'var(--transition)',
                                                            }}
                                                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--primary-bg)')}
                                                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                                        >
                                                            <div>
                                                                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t.name}</div>
                                                                {t.reportTAT && <div style={{ fontSize: '0.688rem', color: 'var(--text-secondary)' }}>TAT: {t.reportTAT}</div>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                )}
                            </div>

                            {/* Selected Tests as Chips */}
                            {selectedTests.length > 0 && (
                                <div style={{ marginBottom: 'var(--space-md)' }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
                                        {selectedTests.map((t) => (
                                            <span key={t.id} className="badge" style={{
                                                background: 'var(--primary-bg)', color: 'var(--primary)', padding: '6px 10px',
                                                borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 6,
                                                fontSize: '0.813rem', fontWeight: 600,
                                            }}>
                                                {t.name}
                                                <X size={14} style={{ cursor: 'pointer', opacity: 0.7 }}
                                                    onClick={() => setSelectedTests(prev => prev.filter(s => s.id !== t.id))} />
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Urgency selector */}
                            <div className="form-group" style={{ maxWidth: 200 }}>
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
                    <div style={{ fontSize: '0.875rem', marginBottom: 12 }}><strong>Diagnosis:</strong> {existingAction.diagnosis}</div>
                    {existingAction.advice && <div style={{ fontSize: '0.875rem', marginBottom: 12 }}><strong>Advice:</strong> {existingAction.advice}</div>}
                    {existingAction.medications && <div style={{ fontSize: '0.875rem', marginBottom: 12 }}><strong>Medications:</strong> {existingAction.medications}</div>}
                    {existingAction.referralNote && <div style={{ fontSize: '0.875rem', marginBottom: 12 }}><strong>Referral:</strong> {existingAction.referralNote}</div>}
                    {existingAction.followupDate && <div style={{ fontSize: '0.875rem', marginBottom: 12 }}><strong>Follow-up:</strong> {new Date(existingAction.followupDate).toLocaleDateString()}</div>}
                    {existingAction.labRecommended && <span className="badge badge-info">Lab Recommended</span>}

                    {/* Structured medicines display */}
                    {existingAction.medicinesJson && (existingAction.medicinesJson as any[]).length > 0 && (
                        <div style={{ marginTop: 'var(--space-md)' }}>
                            <strong style={{ fontSize: '0.875rem' }}>Structured Medications:</strong>
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8, fontSize: '0.813rem' }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg)', textAlign: 'left' }}>
                                        <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>#</th>
                                        <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>Medicine</th>
                                        <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>Dosage</th>
                                        <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>Freq</th>
                                        <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>Days</th>
                                        <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>Timing</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(existingAction.medicinesJson as any[]).map((m: any, i: number) => (
                                        <tr key={i}>
                                            <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>{i + 1}</td>
                                            <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{m.name}</td>
                                            <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>{m.dosage}</td>
                                            <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>{m.frequency}</td>
                                            <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>{m.durationDays}d</td>
                                            <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>{m.timing}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ============ GENERATE PRESCRIPTION ============ */}
            {existingAction && !prescription && (
                <div className="card" style={{ marginBottom: 'var(--space-lg)', borderLeft: '4px solid var(--primary)', background: 'hsl(174, 62%, 97%)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileText size={18} /> Generate Prescription PDF
                    </h3>
                    <p style={{ fontSize: '0.813rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                        Generate a professional prescription document with frozen vitals snapshot, structured medications, and medico-legal traceability.
                    </p>

                    {/* Quick medicine entry if not already in the action */}
                    {!(existingAction.medicinesJson && (existingAction.medicinesJson as any[]).length > 0) && (
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Pill size={16} /> Add Medicines for Prescription
                            </label>
                            {medicines.map((med, idx) => (
                                <div key={idx} style={{
                                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 80px 1fr auto',
                                    gap: 6, marginBottom: 6, alignItems: 'end',
                                }}>
                                    <input type="text" className="form-input" placeholder="Medicine" style={{ padding: '6px', fontSize: '0.75rem' }}
                                        value={med.name} onChange={(e) => updateMedicine(idx, 'name', e.target.value)} />
                                    <input type="text" className="form-input" placeholder="Dosage" style={{ padding: '6px', fontSize: '0.75rem' }}
                                        value={med.dosage} onChange={(e) => updateMedicine(idx, 'dosage', e.target.value)} />
                                    <select className="form-select" style={{ padding: '6px', fontSize: '0.75rem' }}
                                        value={med.frequency} onChange={(e) => updateMedicine(idx, 'frequency', e.target.value)}>
                                        <option value="1-0-1">1-0-1</option><option value="1-1-1">1-1-1</option>
                                        <option value="1-0-0">1-0-0</option><option value="0-0-1">0-0-1</option><option value="SOS">SOS</option>
                                    </select>
                                    <input type="number" className="form-input" min={1} style={{ padding: '6px', fontSize: '0.75rem' }}
                                        value={med.durationDays} onChange={(e) => updateMedicine(idx, 'durationDays', parseInt(e.target.value) || 1)} />
                                    <select className="form-select" style={{ padding: '6px', fontSize: '0.75rem' }}
                                        value={med.timing} onChange={(e) => updateMedicine(idx, 'timing', e.target.value)}>
                                        <option value="After Food">After Food</option><option value="Before Food">Before Food</option><option value="None">None</option>
                                    </select>
                                    <button type="button" onClick={() => removeMedicine(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545' }}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            <button type="button" className="btn btn-secondary btn-sm" onClick={addMedicine} style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Plus size={14} /> Add Row
                            </button>
                        </div>
                    )}

                    <button
                        className="btn btn-primary btn-lg btn-block"
                        onClick={() => {
                            // If medicines already in action, use those
                            if (existingAction.medicinesJson && (existingAction.medicinesJson as any[]).length > 0) {
                                setMedicines(existingAction.medicinesJson as any[]);
                            }
                            handleGeneratePrescription();
                        }}
                        disabled={generatingPdf}
                        style={{
                            background: 'linear-gradient(135deg, var(--primary), hsl(174, 62%, 35%))',
                            boxShadow: '0 4px 16px rgba(42, 157, 143, 0.3)',
                        }}
                    >
                        {generatingPdf ? <div className="spinner" /> : (
                            <><FileText size={18} /> Generate Prescription PDF</>
                        )}
                    </button>
                </div>
            )}

            {/* ============ EXISTING PRESCRIPTION ============ */}
            {prescription && (
                <div className="card" style={{ marginBottom: 'var(--space-lg)', borderLeft: '4px solid var(--success)', background: 'hsl(145, 63%, 97%)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileText size={18} /> Prescription Ready
                        <span className="badge" style={{ background: 'var(--success)', color: 'white', fontSize: '0.7rem' }}>v{prescription.versionNumber}</span>
                    </h3>
                    <div style={{ fontSize: '0.875rem', marginBottom: 8 }}>
                        <strong>Diagnosis:</strong> {prescription.diagnosis}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
                        <button
                            onClick={() => generatePrescriptionPDF(prescription)}
                            className="btn btn-primary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                            <Download size={16} /> Download Prescription PDF
                        </button>
                        {/* Regenerate button — always available so doctor can update after lab results */}
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                                if (existingAction?.medicinesJson && (existingAction.medicinesJson as any[]).length > 0) {
                                    setMedicines(existingAction.medicinesJson as any[]);
                                }
                                handleGeneratePrescription();
                            }}
                            disabled={generatingPdf}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                            {generatingPdf ? <div className="spinner" /> : <><FileText size={14} /> Update Prescription</>}
                        </button>
                    </div>
                    {prescription.versions && prescription.versions.length > 0 && (
                        <div style={{ marginTop: 'var(--space-md)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Previous versions: {prescription.versions.length}
                        </div>
                    )}
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
                                    <button onClick={async () => {
                                        try {
                                            const res = await labApi.getReportUrl(lo.id);
                                            window.open(res.data.url, '_blank');
                                        } catch { }
                                    }} className="btn btn-secondary btn-sm" style={{ marginBottom: 8 }}>
                                        View Report
                                    </button>
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

            {/* WebRTC Video Call Overlay */}
            {showVideoCall && service.nurseId && (
                <VideoCall
                    targetUserId={service.nurseId}
                    targetName={service.nurse?.name || 'Nurse'}
                    serviceId={service.id}
                    callerName={user?.name || 'Doctor'}
                    onClose={() => setShowVideoCall(false)}
                />
            )}
        </div>
    );
}
