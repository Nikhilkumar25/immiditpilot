import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { serviceApi, clinicalApi, labApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, User, Send, Check, Upload, Navigation, MapPin, Phone, Camera, Clock, AlertTriangle, Star } from 'lucide-react';
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
}: {
    field: NurseFormField;
    value: any;
    onChange: (val: any) => void;
}) {
    switch (field.type) {
        case 'text':
            return (
                <div className="form-group">
                    <label className="form-label">{field.label} {field.required && <span style={{ color: 'var(--critical)' }}>*</span>}</label>
                    <input type="text" className="form-input" placeholder={field.label}
                        value={value || ''} onChange={(e) => onChange(e.target.value)} />
                    {field.description && <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{field.description}</small>}
                </div>
            );

        case 'number':
            return (
                <div className="form-group">
                    <label className="form-label">{field.label} {field.required && <span style={{ color: 'var(--critical)' }}>*</span>}</label>
                    <input type="number" className="form-input" placeholder={field.label}
                        value={value || ''} onChange={(e) => onChange(e.target.value)} />
                </div>
            );

        case 'textarea':
            return (
                <div className="form-group">
                    <label className="form-label">{field.label} {field.required && <span style={{ color: 'var(--critical)' }}>*</span>}</label>
                    <textarea className="form-textarea" placeholder={field.label}
                        value={value || ''} onChange={(e) => onChange(e.target.value)} />
                    {field.description && <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{field.description}</small>}
                </div>
            );

        case 'select':
            return (
                <div className="form-group">
                    <label className="form-label">{field.label} {field.required && <span style={{ color: 'var(--critical)' }}>*</span>}</label>
                    <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
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

    const fetchData = useCallback(async () => {
        try {
            const [servRes, labRes] = await Promise.all([
                serviceApi.getById(id!),
                labApi.getNurseTasks(),
            ]);
            setService(servRes.data);
            setLabTasks(labRes.data.filter((t: any) => t.serviceId === id));
        } catch (err) { console.error(err); }
        setLoading(false);
    }, [id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Get the flow config for this service type
    const flowUI = service ? getServiceFlowUI(service.serviceType) : null;
    const vitalFields = flowUI?.nurseFields.filter(f => f.group === 'vitals') || [];
    const serviceFields = flowUI?.nurseFields.filter(f => f.group === 'service_specific') || [];

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
        if (flowUI) {
            for (const field of flowUI.nurseFields) {
                if (field.required) {
                    const val = formValues[field.field];
                    if (val === undefined || val === null || val === '' || val === false) {
                        missingFields.push(field.label);
                    }
                }
            }
        }
        if (missingFields.length > 0) {
            addToast('error', `Missing required fields: ${missingFields.join(', ')}`);
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
            await labApi.collectSample(labOrderId, checklist);
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
                    <AlertTriangle size={22} /> 🚨 EMERGENCY ASSESSMENT — Prioritize this case immediately
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
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <span className="badge badge-primary" style={flowUI?.isEmergency ? { background: '#dc3545', color: 'white' } : {}}>
                            {service.status.replace(/_/g, ' ')}
                        </span>
                        {service.isImmediate && (
                            <span className="badge badge-warning" style={{ fontSize: '0.625rem' }}>⚡ IMMEDIATE</span>
                        )}
                    </div>
                </div>
                <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--bg)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
                    <strong>Symptoms:</strong> {service.symptoms}
                </div>
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

            {/* ============ DYNAMIC VITALS + SERVICE-SPECIFIC FORM ============ */}
            {(service.status === 'nurse_on_the_way' || service.status === 'vitals_recorded') && !hasReport && (
                <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
                        {flowUI?.icon} Record Vitals — {service.serviceType}
                    </h3>

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
                                    <DynamicField key={field.field} field={field}
                                        value={formValues[field.field]}
                                        onChange={(val) => updateField(field.field, val)} />
                                ))}
                            </div>
                        </>
                    )}

                    {/* Service-Specific Section */}
                    {serviceFields.length > 0 && (
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

                    {/* Nurse Notes (always present) */}
                    <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
                        <label className="form-label">Nurse Notes</label>
                        <textarea className="form-textarea" placeholder="Observations, patient condition..."
                            value={nurseNotes} onChange={(e) => setNurseNotes(e.target.value)} />
                    </div>

                    {/* Triage Level (always present) */}
                    <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
                        <label className="form-label">Triage Level <span style={{ color: 'var(--critical)' }}>*</span></label>
                        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                            {TRIAGE_OPTIONS.map((opt) => (
                                <button key={opt.value} type="button"
                                    onClick={() => setTriageLevel(opt.value)}
                                    style={{
                                        flex: 1, padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '0.875rem',
                                        fontWeight: triageLevel === opt.value ? 700 : 400, cursor: 'pointer',
                                        background: triageLevel === opt.value ? `${opt.color}15` : 'var(--bg)',
                                        border: `2px solid ${triageLevel === opt.value ? opt.color : 'var(--border)'}`,
                                        transition: 'var(--transition)',
                                    }}>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

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
                                {flowUI?.urgentSubmit ? '🚨 URGENT Submit to Doctor' : 'Submit to Doctor'}
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
