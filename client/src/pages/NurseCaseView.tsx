import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { serviceApi, clinicalApi, labApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, User, Send, Check, Upload, Navigation, MapPin, Phone, Camera, Clock, AlertTriangle, Star, Trash2, Plus } from 'lucide-react';
import { getServiceFlowUI, NurseFormField } from '../services/ServiceFlowConfig';
import RatingDialog from '../components/RatingDialog';
import { ratingApi } from '../services/api';

const TRIAGE_OPTIONS = [
    { value: 'mild', label: '🟢 Mild', color: 'var(--success)' },
    { value: 'moderate', label: '🟡 Moderate', color: 'var(--warning)' },
    { value: 'severe', label: '🔴 Severe', color: 'var(--critical)' },
];

// ============ DYNAMIC FIELD RENDERER ============
function DynamicField({
    field,
    value,
    onChange,
    id,
}: {
    field: NurseFormField;
    value: any;
    onChange: (val: any) => void;
    id?: string;
}) {
    const inputId = id || `field-${field.field}`;

    switch (field.type) {
        case 'text':
            return (
                <div className="form-group">
                    <label className="form-label" htmlFor={inputId}>{field.label} {field.required && <span style={{ color: 'var(--critical)' }}>*</span>}</label>
                    <input type="text" className="form-input" id={inputId} name={field.field} placeholder={field.label}
                        value={value || ''} onChange={(e) => onChange(e.target.value)} />
                    {field.description && <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{field.description}</small>}
                </div>
            );

        case 'number':
            return (
                <div className="form-group">
                    <label className="form-label" htmlFor={inputId}>{field.label} {field.required && <span style={{ color: 'var(--critical)' }}>*</span>}</label>
                    <input type="number" className="form-input" id={inputId} name={field.field} placeholder={field.label}
                        min={field.min} max={field.max}
                        value={value || ''} onChange={(e) => onChange(e.target.value)} />
                    {(field.min !== undefined || field.max !== undefined) && (
                        <small style={{ color: 'var(--text-secondary)', fontSize: '0.688rem', display: 'block', marginTop: 4 }}>
                            Sense Check: {field.min ?? 'Any'} – {field.max ?? 'Any'}
                        </small>
                    )}
                </div>
            );

        case 'textarea':
            return (
                <div className="form-group">
                    <label className="form-label" htmlFor={inputId}>{field.label} {field.required && <span style={{ color: 'var(--critical)' }}>*</span>}</label>
                    <textarea className="form-textarea" id={inputId} name={field.field} placeholder={field.label}
                        value={value || ''} onChange={(e) => onChange(e.target.value)} />
                    {field.description && <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{field.description}</small>}
                </div>
            );

        case 'select':
            return (
                <div className="form-group">
                    <label className="form-label" htmlFor={inputId}>{field.label} {field.required && <span style={{ color: 'var(--critical)' }}>*</span>}</label>
                    <div id={inputId} style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                        {field.options?.map((opt) => (
                            <button key={opt} type="button"
                                onClick={() => onChange(opt)}
                                style={{
                                    padding: '8px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.813rem',
                                    fontWeight: value === opt ? 700 : 400, cursor: 'pointer',
                                    background: value === opt ? 'var(--primary-bg)' : 'var(--bg)',
                                    border: `2px solid ${value === opt ? 'var(--primary)' : 'var(--border)'}`,
                                    color: value === opt ? 'var(--primary)' : 'var(--text)',
                                    transition: 'var(--transition)',
                                }}>
                                {opt.replace(/_/g, ' ')}
                            </button>
                        ))}
                    </div>
                    {field.description && <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{field.description}</small>}
                </div>
            );

        case 'boolean':
            return (
                <div className="form-group">
                    <div
                        onClick={() => onChange(!value)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer',
                            padding: '12px 16px', borderRadius: 'var(--radius-md)',
                            background: value ? 'hsl(145, 63%, 95%)' : 'var(--bg)',
                            border: `2px solid ${value ? 'var(--success)' : 'var(--border)'}`,
                            transition: 'var(--transition)',
                        }}>
                        <div style={{
                            width: 22, height: 22, borderRadius: 'var(--radius-sm)',
                            border: `2px solid ${value ? 'var(--success)' : 'var(--border)'}`,
                            background: value ? 'var(--success)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            {value && <Check size={14} color="white" />}
                        </div>
                        <span style={{ fontWeight: value ? 600 : 400, fontSize: '0.875rem' }}>
                            {field.label} {field.required && <span style={{ color: 'var(--critical)' }}>*</span>}
                        </span>
                    </div>
                    {field.description && <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block', marginTop: 4 }}>{field.description}</small>}
                </div>
            );

        case 'image':
            return (
                <div className="form-group">
                    <label className="form-label">{field.label} {field.required && <span style={{ color: 'var(--critical)' }}>*</span>}</label>
                    <div style={{
                        border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)',
                        padding: 'var(--space-lg)', textAlign: 'center', cursor: 'pointer',
                        background: value ? 'hsl(145, 63%, 95%)' : 'var(--bg)',
                        transition: 'var(--transition)',
                    }}>
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            style={{ display: 'none' }}
                            id={`file-${field.field}`}
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = () => onChange(reader.result);
                                    reader.readAsDataURL(file);
                                }
                            }}
                        />
                        <label htmlFor={`file-${field.field}`} style={{ cursor: 'pointer' }}>
                            {value ? (
                                <div>
                                    <img src={value} alt={field.label} style={{ maxWidth: 200, maxHeight: 150, borderRadius: 'var(--radius-md)', marginBottom: 8 }} />
                                    <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>✅ Photo captured — tap to retake</div>
                                </div>
                            ) : (
                                <div>
                                    <Camera size={32} color="var(--text-secondary)" style={{ marginBottom: 8 }} />
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Tap to take photo</div>
                                </div>
                            )}
                        </label>
                    </div>
                    {field.description && <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block', marginTop: 4 }}>{field.description}</small>}
                </div>
            );

        case 'datetime':
            return (
                <div className="form-group">
                    <label className="form-label">{field.label} {field.required && <span style={{ color: 'var(--critical)' }}>*</span>}</label>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                        <input type="datetime-local" className="form-input" style={{ flex: 1 }}
                            value={value || ''} onChange={(e) => onChange(e.target.value)} />
                        <button type="button" className="btn btn-secondary btn-sm"
                            onClick={() => onChange(new Date().toISOString().slice(0, 16))}
                            style={{ whiteSpace: 'nowrap' }}>
                            <Clock size={14} /> Now
                        </button>
                    </div>
                    {field.description && <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{field.description}</small>}
                </div>
            );

        default:
            return null;
    }
}

// ============ MAIN COMPONENT ============
export default function NurseCaseView() {
    const { id } = useParams<{ id: string }>();
    const [service, setService] = useState<any>(null);
    const [labTasks, setLabTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const { user } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();

    // Dynamic form state — populated from flow config
    const [formValues, setFormValues] = useState<Record<string, any>>({});
    const [nurseNotes, setNurseNotes] = useState('');
    const [triageLevel, setTriageLevel] = useState('');

    // Lab checklist
    const [checklist, setChecklist] = useState({
        identityConfirmed: false, fastingConfirmed: false, sampleCollected: false, properLabeling: false,
    });
    const [ratingConfig, setRatingConfig] = useState<{ isOpen: boolean; toUserId: string; title: string, categories: string[] }>({
        isOpen: false, toUserId: '', title: '', categories: []
    });

    // Sample collection media
    const [samplePhotos, setSamplePhotos] = useState<string[]>([]);
    const [scannedBarcodes, setScannedBarcodes] = useState<{ value: string; scannedAt: string }[]>([]);
    const [manualBarcode, setManualBarcode] = useState('');

    const fetchData = useCallback(async () => {
        try {
            const [servRes, labRes] = await Promise.all([
                serviceApi.getById(id!),
                labApi.getNurseTasks(),
            ]);
            setService(servRes.data);
            setLabTasks(labRes.data.filter((t: any) => t.serviceId === id));

            // Populate form values from report if it exists
            if (servRes.data.clinicalReport) {
                setFormValues(servRes.data.clinicalReport.vitalsJson || {});
                setNurseNotes(servRes.data.clinicalReport.nurseNotes || '');
                setTriageLevel(servRes.data.clinicalReport.triageLevel || '');
            }
        } catch (err) { console.error(err); }
        setLoading(false);
    }, [id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Get the flow config for this service type
    const flowUI = service ? getServiceFlowUI(service.serviceType) : null;
    let vitalFields = flowUI?.nurseFields.filter(f => f.group === 'vitals') || [];
    const serviceFields = flowUI?.nurseFields.filter(f => f.group === 'service_specific') || [];

    // Inject prescription status field for restricted services if not already present
    if (flowUI?.requiresProcedureApproval && !vitalFields.some(f => f.field === 'prescriptionStatus')) {
        vitalFields = [
            ...vitalFields,
            {
                field: 'prescriptionStatus',
                label: 'Prescription Status',
                type: 'select',
                required: true,
                options: ['Verified (On-Site)', 'Missing (Request from Doctor)', 'Inaccurate/Conflict'],
                description: 'Verify the prescription or request a new one from the doctor (₹199 fee applies).'
            } as any
        ];
    }

    const handleStartVisit = async () => {
        try {
            await serviceApi.updateStatus(id!, 'nurse_on_the_way');
            addToast('success', 'Visit started — status: en route');
            fetchData();
        } catch (err: any) { addToast('error', err.response?.data?.error || 'Failed'); }
    };

    const handleSubmitVitals = async () => {
        if (!triageLevel) {
            addToast('error', 'Please select a triage level');
            return;
        }

        // Client-side check for required fields
        const missingFields: string[] = [];
        const currentStage = isProcedureStage ? 'procedure' : 'assessment';

        if (flowUI) {
            const isRequestingDoctor = formValues.prescriptionStatus === 'Missing (Request from Doctor)';

            for (const field of flowUI.nurseFields) {
                // Only validate fields for the current stage
                const fieldStage = (field as any).stage || 'assessment';
                if (fieldStage !== currentStage) continue;

                const val = formValues[field.field];

                if (field.required) {
                    // Special Case: Prescription photo not required if requesting from doctor
                    if (field.field === 'prescriptionPhoto' && isRequestingDoctor) continue;

                    if (val === undefined || val === null || val === '' || val === false) {
                        missingFields.push(field.label);
                    }
                }

                // Sense checks for numeric fields
                if (field.type === 'number' && val !== undefined && val !== null && val !== '') {
                    const numVal = Number(val);
                    if (field.min !== undefined && numVal < field.min) {
                        missingFields.push(`${field.label} is too low (Min: ${field.min})`);
                    }
                    if (field.max !== undefined && numVal > field.max) {
                        missingFields.push(`${field.label} is too high (Max: ${field.max})`);
                    }
                }
            }
        }
        if (missingFields.length > 0) {
            addToast('error', `Missing required fields for ${currentStage}: ${missingFields.join(', ')}`);
            return;
        }

        setSubmitting(true);
        try {
            // Collect image attachments for server validation
            const attachments: string[] = [];
            if (flowUI) {
                for (const field of flowUI.nurseFields) {
                    if (field.type === 'image' && formValues[field.field]) {
                        attachments.push(formValues[field.field]);
                    }
                }
            }

            const resp = await clinicalApi.submit(id!, {
                vitalsJson: formValues, nurseNotes, triageLevel, attachments,
            });

            if (resp.data?.autoClosedNote) {
                addToast('success', resp.data.autoClosedNote);
            } else {
                addToast('success', 'Clinical report submitted — awaiting doctor review');
            }
            fetchData();
        } catch (err: any) {
            const errorData = err.response?.data;
            if (errorData?.details) {
                addToast('error', errorData.details.join('\n'));
            } else {
                addToast('error', errorData?.error || 'Failed to submit');
            }
        }
        setSubmitting(false);
    };

    const handleCollectSample = async (labOrderId: string) => {
        const allChecked = Object.values(checklist).every(Boolean);
        if (!allChecked) {
            addToast('error', 'All checklist items must be confirmed');
            return;
        }
        try {
            await labApi.collectSample(labOrderId, checklist, samplePhotos.length > 0 ? samplePhotos : undefined, scannedBarcodes.length > 0 ? scannedBarcodes : undefined);
            addToast('success', 'Sample collected!');
            fetchData();
        } catch (err: any) { addToast('error', err.response?.data?.error || 'Failed'); }
    };

    const updateField = (field: string, value: any) => {
        setFormValues(prev => ({ ...prev, [field]: value }));
    };

    if (loading) return <div className="loading-page"><div className="spinner" /></div>;
    if (!service) return <div className="empty-state"><p>Case not found.</p></div>;

    const hasReport = !!service.clinicalReport;
    const isRestricted = flowUI?.requiresProcedureApproval;
    const isApproved = service.doctorAction?.procedureApproved;
    const editRequested = service.doctorAction?.requestNurseEdit;

    // Logic for what to show
    const showAssessmentForm = !hasReport || editRequested;
    const isProcedureStage = hasReport && isRestricted && isApproved && !editRequested;
    const isAwaitingApproval = hasReport && isRestricted && !isApproved && !editRequested;

    return (
        <div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/nurse')} style={{ marginBottom: 'var(--space-md)' }}>
                <ArrowLeft size={16} /> Back to Dashboard
            </button>

            {/* Emergency Alert Banner */}
            {flowUI?.isEmergency && (
                <div style={{
                    background: 'linear-gradient(135deg, #dc3545, #c82333)',
                    color: 'white',
                    padding: '12px var(--space-md)',
                    borderRadius: 'var(--radius-lg)',
                    marginBottom: 'var(--space-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    boxShadow: '0 4px 16px rgba(220, 53, 69, 0.4)',
                }}>
                    <AlertTriangle size={20} style={{ flexShrink: 0 }} /> 🚨 EMERGENCY — Prioritize this case
                </div>
            )}

            {/* Patient info */}
            <div className="card" style={{ marginBottom: 'var(--space-lg)', borderLeft: flowUI ? `4px solid ${flowUI.color}` : undefined, padding: 'var(--space-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <div className="desktop-only" style={{
                        width: 48, height: 48, borderRadius: '50%', background: 'var(--primary-bg)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.5rem',
                    }}>
                        {flowUI?.icon || <User size={22} />}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{service.patient?.name}</h2>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {service.serviceType} · 📞 {service.patient?.phone}
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        <span className="badge badge-primary" style={{ ...(flowUI?.isEmergency ? { background: '#dc3545', color: 'white' } : {}), fontSize: '0.625rem' }}>
                            {service.status.replace(/_/g, ' ')}
                        </span>
                        {service.isImmediate && (
                            <span className="badge badge-warning" style={{ fontSize: '0.625rem' }}>⚡ IMMEDIATE</span>
                        )}
                    </div>
                </div>
                <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-sm) var(--space-md)', background: 'var(--bg)', borderRadius: 'var(--radius-md)', fontSize: '0.813rem' }}>
                    <strong>Symptoms:</strong> {service.symptoms}
                </div>
                {service.hasProvidedMedication === false && service.requiredMedicationName && (
                    <div style={{
                        marginTop: 'var(--space-md)',
                        padding: '12px var(--space-md)',
                        background: 'hsl(45, 100%, 96%)',
                        border: '1px solid var(--warning)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        color: 'var(--warning-dark)',
                        fontWeight: 600,
                        fontSize: '0.875rem'
                    }}>
                        <AlertTriangle size={20} style={{ flexShrink: 0, color: 'var(--warning)' }} />
                        <div>
                            ⚠️ Patient does not have the medicine.
                            <div style={{ color: 'var(--text)', fontSize: '0.75rem', marginTop: 2, fontWeight: 500 }}>
                                Please carry from inventory: <strong>{service.requiredMedicationName}</strong>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Start Visit / Navigate */}
            {service.status === 'nurse_assigned' && (
                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
                    <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={handleStartVisit}>
                        🚗 Start Visit (En Route)
                    </button>
                    {service.savedAddress?.lat && (
                        <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${service.savedAddress.lat},${service.savedAddress.lng}`}
                            target="_blank" rel="noopener noreferrer"
                            className="btn btn-secondary btn-lg"
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Navigation size={18} /> Navigate
                        </a>
                    )}
                </div>
            )}

            {/* Address Details */}
            {service.savedAddress && (
                <div className="card" style={{ marginBottom: 'var(--space-lg)', borderLeft: '4px solid var(--secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <MapPin size={16} color="var(--secondary)" />
                        <strong style={{ fontSize: '0.875rem' }}>Patient Address</strong>
                    </div>
                    <div style={{ fontSize: '0.813rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {service.savedAddress.flatNumber && <span>Flat {service.savedAddress.flatNumber}</span>}
                        {service.savedAddress.floor && <span>, Floor {service.savedAddress.floor}</span>}
                        {service.savedAddress.buildingName && <span>, {service.savedAddress.buildingName}</span>}
                        {service.savedAddress.landmark && <span> · Near {service.savedAddress.landmark}</span>}
                        <br />{service.savedAddress.address || service.location}
                    </div>
                </div>
            )}

            {/* ============ STAGE 1: ASSESSMENT FORM ============ */}
            {((service.status === 'nurse_on_the_way' || service.status === 'vitals_recorded') || editRequested) && showAssessmentForm && (
                <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {editRequested ? <AlertTriangle size={18} color="var(--warning)" /> : flowUI?.icon}
                        {editRequested ? 'Edit Clinical Assessment' : `Record Vitals — ${service.serviceType}`}
                    </h3>

                    {editRequested && service.doctorAction?.approvalNotes && (
                        <div style={{ padding: 'var(--space-md)', background: 'hsl(45, 100%, 96%)', border: '1px solid var(--warning)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', fontSize: '0.875rem' }}>
                            <strong>Doctor's Request:</strong> {service.doctorAction.approvalNotes}
                        </div>
                    )}

                    {/* Auto-close notice for injection */}
                    {flowUI?.autoCloseInfo && (
                        <div style={{
                            background: 'hsl(210, 80%, 95%)',
                            border: '1px solid hsl(210, 80%, 80%)',
                            borderRadius: 'var(--radius-md)',
                            padding: 'var(--space-sm) var(--space-md)',
                            fontSize: '0.813rem',
                            marginBottom: 'var(--space-lg)',
                            color: 'hsl(210, 80%, 35%)',
                        }}>
                            ℹ️ {flowUI.autoCloseInfo}
                        </div>
                    )}

                    {/* Vital Signs Section */}
                    {vitalFields.length > 0 && (
                        <>
                            <div style={{ fontSize: '0.813rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Vital Signs
                            </div>
                            <div className="vitals-grid" style={{ marginBottom: 'var(--space-lg)' }}>
                                {vitalFields.map((field) => (
                                    <DynamicField
                                        key={field.field}
                                        id={`input-${field.field}`}
                                        field={field}
                                        value={formValues[field.field]}
                                        onChange={(val) => updateField(field.field, val)}
                                    />
                                ))}
                            </div>
                        </>
                    )}

                    {/* Service-Specific Section (ONLY if not restricted, or if it's Assessment part) */}
                    {/* For restricted services, we show only ASSESSMENT fields now */}
                    {serviceFields.length > 0 && !isRestricted && (
                        <>
                            <div style={{
                                fontSize: '0.813rem', fontWeight: 600, color: flowUI?.color || 'var(--text-secondary)',
                                marginBottom: 'var(--space-sm)', textTransform: 'uppercase', letterSpacing: '0.05em',
                                borderTop: '1px solid var(--border)', paddingTop: 'var(--space-md)',
                            }}>
                                {flowUI?.icon} {service.serviceType} — Specific Fields
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                                {serviceFields.map((field) => (
                                    <DynamicField key={field.field} field={field}
                                        value={formValues[field.field]}
                                        onChange={(val) => updateField(field.field, val)} />
                                ))}
                            </div>
                        </>
                    )}

                    {/* Vitals & Triage Section */}
                    <div style={{ background: 'var(--bg)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.813rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--space-md)', textTransform: 'uppercase' }}>
                            🏥 Triage & Priority *
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                            {TRIAGE_OPTIONS.map((opt) => (
                                <button key={opt.value} type="button"
                                    onClick={() => setTriageLevel(opt.value)}
                                    style={{
                                        flex: 1, minWidth: 100, padding: 'var(--space-md)', borderRadius: 'var(--radius-md)',
                                        border: `2px solid ${triageLevel === opt.value ? opt.color : 'var(--border)'}`,
                                        background: triageLevel === opt.value ? `${opt.color}10` : 'var(--bg)',
                                        color: triageLevel === opt.value ? opt.color : 'var(--text)',
                                        fontWeight: triageLevel === opt.value ? 700 : 500,
                                        transition: 'var(--transition)',
                                    }}>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
                        <label className="form-label">Nurse Assessment Notes</label>
                        <textarea className="form-textarea" placeholder="Describe physical findings, mental state, or any critical observations..."
                            value={nurseNotes} onChange={(e) => setNurseNotes(e.target.value)} />
                    </div>


                    {/* Prescription Upload for Restricted Services */}
                    {isRestricted && (
                        <div style={{ marginBottom: 'var(--space-lg)' }}>
                            <div style={{ fontSize: '0.813rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)', textTransform: 'uppercase' }}>
                                Prescription (Required for restricted procedures)
                            </div>

                            {formValues.prescriptionStatus === 'Missing (Request from Doctor)' ? (
                                <div style={{
                                    padding: 'var(--space-md)',
                                    background: 'var(--primary-bg)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--primary)',
                                    marginBottom: 'var(--space-md)',
                                    color: 'var(--primary)',
                                    fontSize: '0.875rem',
                                    fontWeight: 600
                                }}>
                                    ✨ Doctor will review symptoms and issue a new prescription.
                                    <div style={{ fontSize: '0.75rem', marginTop: 4, fontWeight: 400 }}>
                                        Note: A ₹199 consultation fee will be added to the package.
                                    </div>
                                </div>
                            ) : (
                                <DynamicField
                                    field={{ field: 'prescriptionPhoto', label: 'Upload Prescription', type: 'image', required: true, description: 'Photo of the doctor\'s prescription for this procedure' }}
                                    value={formValues.prescriptionPhoto}
                                    onChange={(val) => updateField('prescriptionPhoto', val)}
                                />
                            )}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        className={`btn ${flowUI?.urgentSubmit ? 'btn-danger' : 'btn-success'} btn-lg btn-block`}
                        onClick={handleSubmitVitals}
                        disabled={submitting}
                        style={flowUI?.urgentSubmit ? {
                            background: 'linear-gradient(135deg, #dc3545, #c82333)',
                            boxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)',
                        } : {}}
                    >
                        {submitting ? <div className="spinner" /> : (
                            <>
                                <Send size={18} />
                                {editRequested ? 'Submit Updated Assessment' : (flowUI?.urgentSubmit ? '🚨 URGENT Submit to Doctor' : 'Submit for Doctor Approval')}
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* ============ WAIT STATE: AWAITING APPROVAL ============ */}
            {isAwaitingApproval && (
                <div className="card" style={{ marginBottom: 'var(--space-lg)', textAlign: 'center', padding: 'var(--space-xl) var(--space-md)', background: 'hsl(210, 80%, 98%)', border: '2px dashed var(--primary)' }}>
                    <div style={{ width: 64, height: 64, background: 'var(--primary-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-md)' }}>
                        <Clock size={32} className="spinner" style={{ color: 'var(--primary)', animationDuration: '3s' }} />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 'var(--space-sm)' }}>Awaiting Doctor Approval</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto' }}>
                        The clinical assessment and prescription have been sent to the doctor.
                        <strong> Please wait for approval before performing the {service.serviceType}.</strong>
                    </p>
                    <button className="btn btn-secondary btn-sm" onClick={fetchData} style={{ marginTop: 'var(--space-lg)' }}>
                        Check Status
                    </button>
                </div>
            )}

            {/* ============ STAGE 2: PROCEDURE RECORDING ============ */}
            {isProcedureStage && (
                <div className="card" style={{ marginBottom: 'var(--space-lg)', borderLeft: '4px solid var(--success)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)', padding: 'var(--space-md)', background: 'hsl(145, 63%, 97%)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ width: 24, height: 24, background: 'var(--success)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check size={14} color="white" />
                        </div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--success)' }}>
                            PROCEDURE APPROVED BY DOCTOR
                        </div>
                    </div>

                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
                        Record {service.serviceType} Procedure
                    </h3>

                    {service.doctorAction?.approvalNotes && (
                        <div style={{ padding: 'var(--space-md)', background: 'var(--bg)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', fontSize: '0.813rem', color: 'var(--text-secondary)' }}>
                            <strong>Doctor's Notes:</strong> {service.doctorAction.approvalNotes}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                        {serviceFields.map((field) => (
                            <DynamicField key={field.field} field={field}
                                value={formValues[field.field]}
                                onChange={(val) => updateField(field.field, val)} />
                        ))}
                    </div>

                    <button
                        className="btn btn-success btn-lg btn-block"
                        onClick={handleSubmitVitals} // Resubmit with procedure data
                        disabled={submitting}
                    >
                        {submitting ? <div className="spinner" /> : (
                            <>
                                <Check size={18} /> Complete Procedure & Close Case
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Existing Report */}
            {hasReport && (
                <div className="card" style={{ marginBottom: 'var(--space-lg)', borderLeft: '4px solid var(--success)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-md)' }}>✅ Clinical Report Submitted</h3>
                    <div className="vitals-grid" style={{ marginBottom: 'var(--space-md)' }}>
                        {Object.entries(service.clinicalReport?.vitalsJson || {}).map(([key, val]) => {
                            // Skip image data (base64) display in grid
                            if (typeof val === 'string' && val.startsWith('data:image')) return null;
                            return (
                                <div key={key} className="vital-card">
                                    <div className="vital-value">{typeof val === 'boolean' ? (val ? '✅' : '❌') : (val as string || '–')}</div>
                                    <div className="vital-label">{key.replace(/([A-Z])/g, ' $1')}</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Show submitted images */}
                    {(service.clinicalReport?.attachments || []).length > 0 && (
                        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', marginBottom: 'var(--space-md)' }}>
                            {service.clinicalReport.attachments.map((img: string, i: number) => (
                                <img key={i} src={img} alt={`Attachment ${i + 1}`}
                                    style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} />
                            ))}
                        </div>
                    )}

                    <div style={{ fontSize: '0.875rem' }}><strong>Notes:</strong> {service.clinicalReport?.nurseNotes}</div>
                    <div style={{ marginTop: 8 }}>
                        <span className={`badge badge-${service.clinicalReport?.triageLevel}`}>
                            {service.clinicalReport?.triageLevel}
                        </span>
                    </div>
                </div>
            )}

            {/* Lab Tasks */}
            {labTasks.length > 0 && (
                <div className="card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>🧪 Sample Collection</h3>
                    {labTasks.map((task) => (
                        <div key={task.id}>
                            <div style={{ marginBottom: 'var(--space-md)', fontSize: '0.875rem' }}>
                                <strong>Tests:</strong> {(task.testsJson as any[])?.map((t: any) => t.name).join(', ')}
                            </div>

                            {/* Checklist */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
                                {[
                                    { key: 'identityConfirmed', label: 'Patient identity confirmed' },
                                    { key: 'fastingConfirmed', label: 'Fasting status confirmed' },
                                    { key: 'sampleCollected', label: 'Sample collected properly' },
                                    { key: 'properLabeling', label: 'Proper labeling done' },
                                ].map((item) => (
                                    <div key={item.key}
                                        className={`checklist-item ${(checklist as any)[item.key] ? 'checked' : ''}`}
                                        onClick={() => setChecklist({ ...checklist, [item.key]: !(checklist as any)[item.key] })}>
                                        <div className="checklist-checkbox">
                                            {(checklist as any)[item.key] && <Check size={14} />}
                                        </div>
                                        <span>{item.label}</span>
                                    </div>
                                ))}
                            </div>

                            {/* 📸 Sample Tube Photos */}
                            <div style={{ marginBottom: 'var(--space-lg)' }}>
                                <div style={{ fontSize: '0.813rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 'var(--space-sm)', letterSpacing: '0.05em' }}>
                                    📸 Sample Tube Photos
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', marginBottom: 'var(--space-sm)' }}>
                                    {samplePhotos.map((photo, i) => (
                                        <div key={i} style={{ position: 'relative', width: 100, height: 80 }}>
                                            <img src={photo} alt={`Tube ${i + 1}`} style={{
                                                width: '100%', height: '100%', objectFit: 'cover',
                                                borderRadius: 'var(--radius-md)', border: '2px solid var(--success)',
                                            }} />
                                            <button onClick={() => setSamplePhotos(prev => prev.filter((_, idx) => idx !== i))}
                                                style={{
                                                    position: 'absolute', top: -6, right: -6, width: 20, height: 20,
                                                    borderRadius: '50%', background: '#dc3545', color: 'white', border: 'none',
                                                    fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>×</button>
                                        </div>
                                    ))}
                                    {/* Add photo button */}
                                    <label style={{
                                        width: 100, height: 80, borderRadius: 'var(--radius-md)',
                                        border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                        background: 'var(--bg)', transition: 'var(--transition)',
                                        gap: 4,
                                    }}>
                                        <Camera size={24} color="var(--text-secondary)" />
                                        <span style={{ fontSize: '0.625rem', color: 'var(--text-secondary)' }}>Add Photo</span>
                                        <input
                                            type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onload = () => setSamplePhotos(prev => [...prev, reader.result as string]);
                                                    reader.readAsDataURL(file);
                                                }
                                                e.target.value = '';
                                            }}
                                        />
                                    </label>
                                </div>
                                {samplePhotos.length > 0 && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>✅ {samplePhotos.length} photo{samplePhotos.length !== 1 ? 's' : ''} captured</div>
                                )}
                            </div>

                            {/* 📱 Barcode Scanner */}
                            <div style={{ marginBottom: 'var(--space-lg)' }}>
                                <div style={{ fontSize: '0.813rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 'var(--space-sm)', letterSpacing: '0.05em' }}>
                                    📱 Tube / Box Barcodes
                                </div>

                                {/* Scanned barcodes list */}
                                {scannedBarcodes.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', marginBottom: 'var(--space-sm)' }}>
                                        {scannedBarcodes.map((bc, i) => (
                                            <div key={i} style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '8px 12px', background: 'hsl(210, 80%, 97%)',
                                                border: '1px solid hsl(210, 80%, 88%)', borderRadius: 'var(--radius-md)',
                                            }}>
                                                <div>
                                                    <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 600 }}>{bc.value}</div>
                                                    <div style={{ fontSize: '0.625rem', color: 'var(--text-secondary)' }}>{new Date(bc.scannedAt).toLocaleTimeString()}</div>
                                                </div>
                                                <button onClick={() => setScannedBarcodes(prev => prev.filter((_, idx) => idx !== i))}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', padding: 4 }}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Scan from camera photo */}
                                <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                                    <label className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                        <Camera size={14} /> Scan Barcode
                                        <input
                                            type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                e.target.value = '';
                                                try {
                                                    // Try native BarcodeDetector API
                                                    if ('BarcodeDetector' in window) {
                                                        const bitmap = await createImageBitmap(file);
                                                        const detector = new (window as any).BarcodeDetector({ formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code', 'upc_a', 'upc_e', 'codabar'] });
                                                        const barcodes = await detector.detect(bitmap);
                                                        if (barcodes.length > 0) {
                                                            const newBarcodes = barcodes.map((b: any) => ({ value: b.rawValue, scannedAt: new Date().toISOString() }));
                                                            setScannedBarcodes(prev => [...prev, ...newBarcodes]);
                                                            addToast('success', `Scanned ${barcodes.length} barcode(s)!`);
                                                        } else {
                                                            addToast('error', 'No barcode detected in photo. Try again or enter manually.');
                                                        }
                                                    } else {
                                                        addToast('info', 'Camera barcode scanning not supported on this browser. Please enter barcode manually.');
                                                    }
                                                } catch (err) {
                                                    console.error('Barcode scan error:', err);
                                                    addToast('error', 'Failed to scan barcode. Try entering manually.');
                                                }
                                            }}
                                        />
                                    </label>

                                    {/* Manual entry fallback */}
                                    <div style={{ display: 'flex', gap: 'var(--space-xs)', flex: 1, minWidth: 180 }}>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Enter barcode manually"
                                            style={{ padding: '6px 10px', fontSize: '0.813rem', flex: 1 }}
                                            value={manualBarcode}
                                            onChange={(e) => setManualBarcode(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && manualBarcode.trim()) {
                                                    setScannedBarcodes(prev => [...prev, { value: manualBarcode.trim(), scannedAt: new Date().toISOString() }]);
                                                    setManualBarcode('');
                                                }
                                            }}
                                        />
                                        <button className="btn btn-secondary btn-sm"
                                            disabled={!manualBarcode.trim()}
                                            onClick={() => {
                                                if (manualBarcode.trim()) {
                                                    setScannedBarcodes(prev => [...prev, { value: manualBarcode.trim(), scannedAt: new Date().toISOString() }]);
                                                    setManualBarcode('');
                                                }
                                            }}>
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button className="btn btn-secondary btn-block" onClick={() => handleCollectSample(task.id)}
                                disabled={!Object.values(checklist).every(Boolean)}>
                                <Upload size={16} /> Submit Sample Collection
                            </button>
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
                        Please share your feedback about this case to help us improve.
                    </p>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary btn-sm"
                            onClick={() => setRatingConfig({
                                isOpen: true,
                                toUserId: service.patientId,
                                title: `Rate Patient: ${service.patient?.name}`,
                                categories: ['Behaviour', 'Clarity of Guidance', 'Cooperation']
                            })}>
                            Rate Patient
                        </button>
                        {service.doctorId && (
                            <button className="btn btn-secondary btn-sm"
                                onClick={() => setRatingConfig({
                                    isOpen: true,
                                    toUserId: service.doctorId,
                                    title: `Rate Doctor: ${service.doctor?.name}`,
                                    categories: ['Behaviour', 'Guidance', 'Responsiveness']
                                })}>
                                Rate Doctor
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
