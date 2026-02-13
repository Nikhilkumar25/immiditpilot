import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { serviceApi, clinicalApi, labApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, User, Send, Check, Upload } from 'lucide-react';

const TRIAGE_OPTIONS = [
    { value: 'mild', label: '🟢 Mild', color: 'var(--success)' },
    { value: 'moderate', label: '🟡 Moderate', color: 'var(--warning)' },
    { value: 'severe', label: '🔴 Severe', color: 'var(--critical)' },
];

export default function NurseCaseView() {
    const { id } = useParams<{ id: string }>();
    const [service, setService] = useState<any>(null);
    const [labTasks, setLabTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const { user } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();

    // Vitals form
    const [vitals, setVitals] = useState({
        bloodPressure: '', pulse: '', temperature: '', spO2: '', weight: '', bloodSugar: '',
    });
    const [nurseNotes, setNurseNotes] = useState('');
    const [triageLevel, setTriageLevel] = useState('');

    // Lab checklist
    const [checklist, setChecklist] = useState({
        identityConfirmed: false, fastingConfirmed: false, sampleCollected: false, properLabeling: false,
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
        setSubmitting(true);
        try {
            await clinicalApi.submit(id!, {
                vitalsJson: vitals, nurseNotes, triageLevel, attachments: [],
            });
            addToast('success', 'Clinical report submitted — awaiting doctor review');
            fetchData();
        } catch (err: any) {
            addToast('error', err.response?.data?.error || 'Failed to submit');
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

    if (loading) return <div className="loading-page"><div className="spinner" /></div>;
    if (!service) return <div className="empty-state"><p>Case not found.</p></div>;

    const hasReport = !!service.clinicalReport;

    return (
        <div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/nurse')} style={{ marginBottom: 'var(--space-md)' }}>
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
                            {service.serviceType} · {service.location} · 📞 {service.patient?.phone}
                        </div>
                    </div>
                    <span className="badge badge-primary" style={{ marginLeft: 'auto' }}>{service.status.replace(/_/g, ' ')}</span>
                </div>
                <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--bg)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
                    <strong>Symptoms:</strong> {service.symptoms}
                </div>
            </div>

            {/* Start Visit button */}
            {service.status === 'nurse_assigned' && (
                <button className="btn btn-primary btn-lg btn-block" onClick={handleStartVisit}
                    style={{ marginBottom: 'var(--space-lg)' }}>
                    🚗 Start Visit (En Route)
                </button>
            )}

            {/* Vitals Form */}
            {(service.status === 'nurse_on_the_way' || service.status === 'vitals_recorded') && !hasReport && (
                <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>📋 Record Vitals</h3>

                    <div className="vitals-grid" style={{ marginBottom: 'var(--space-lg)' }}>
                        {[
                            { key: 'bloodPressure', label: 'Blood Pressure', placeholder: '120/80' },
                            { key: 'pulse', label: 'Pulse (bpm)', placeholder: '72' },
                            { key: 'temperature', label: 'Temp (°C)', placeholder: '36.6' },
                            { key: 'spO2', label: 'SpO₂ (%)', placeholder: '98' },
                            { key: 'weight', label: 'Weight (kg)', placeholder: '70' },
                            { key: 'bloodSugar', label: 'Blood Sugar', placeholder: '90' },
                        ].map((field) => (
                            <div key={field.key} className="form-group">
                                <label className="form-label">{field.label}</label>
                                <input type="text" className="form-input" placeholder={field.placeholder}
                                    value={(vitals as any)[field.key]}
                                    onChange={(e) => setVitals({ ...vitals, [field.key]: e.target.value })} />
                            </div>
                        ))}
                    </div>

                    <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
                        <label className="form-label">Nurse Notes</label>
                        <textarea className="form-textarea" placeholder="Observations, patient condition..."
                            value={nurseNotes} onChange={(e) => setNurseNotes(e.target.value)} />
                    </div>

                    <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
                        <label className="form-label">Triage Level</label>
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

                    <button className="btn btn-success btn-lg btn-block" onClick={handleSubmitVitals}
                        disabled={submitting}>
                        {submitting ? <div className="spinner" /> : <><Send size={18} /> Submit to Doctor</>}
                    </button>
                </div>
            )}

            {/* Existing Report */}
            {hasReport && (
                <div className="card" style={{ marginBottom: 'var(--space-lg)', borderLeft: '4px solid var(--success)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-md)' }}>✅ Clinical Report Submitted</h3>
                    <div className="vitals-grid" style={{ marginBottom: 'var(--space-md)' }}>
                        {Object.entries(service.clinicalReport?.vitalsJson || {}).map(([key, val]) => (
                            <div key={key} className="vital-card">
                                <div className="vital-value">{val as string || '–'}</div>
                                <div className="vital-label">{key.replace(/([A-Z])/g, ' $1')}</div>
                            </div>
                        ))}
                    </div>
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
        </div>
    );
}
