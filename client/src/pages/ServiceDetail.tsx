import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { serviceApi, prescriptionApi } from '../services/api';
import CaseTracker from '../components/CaseTracker';
import { ArrowLeft, User, MapPin, Clock, FileText, Stethoscope, FlaskConical, XCircle, Download, Pill, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../context/ToastContext';

export default function ServiceDetail() {
    const { id } = useParams<{ id: string }>();
    const [service, setService] = useState<any>(null);
    const [prescription, setPrescription] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const { addToast } = useToast();
    const navigate = useNavigate();

    const fetchService = () => {
        serviceApi.getById(id!)
            .then((res) => setService(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchService();
        // Fetch prescription
        prescriptionApi.get(id!)
            .then((res) => setPrescription(res.data))
            .catch(() => { /* no prescription yet */ });
    }, [id]);

    const handleCancel = async () => {
        if (!confirm('Are you sure you want to cancel this visit?')) return;
        setCancelling(true);
        try {
            await serviceApi.cancel(id!);
            addToast('success', 'Visit cancelled');
            fetchService();
        } catch (err: any) {
            addToast('error', err.response?.data?.error || 'Failed to cancel');
        } finally {
            setCancelling(false);
        }
    };

    if (loading) return <div className="loading-page"><div className="spinner" /></div>;
    if (!service) return <div className="empty-state"><p>Service not found.</p></div>;

    const cancellableStatuses = ['pending_nurse_assignment', 'nurse_assigned'];
    const canCancel = service.status && cancellableStatuses.includes(service.status);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/patient')}>
                    <ArrowLeft size={16} /> Back
                </button>
                {canCancel && (
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={handleCancel}
                        disabled={cancelling}
                        style={{ color: 'var(--critical)', borderColor: 'var(--critical)' }}
                    >
                        <XCircle size={14} /> {cancelling ? 'Cancelling...' : 'Cancel Request'}
                    </button>
                )}
            </div>

            <h1 className="page-title" style={{ marginBottom: 'var(--space-lg)' }}>{service.serviceType}</h1>

            {/* Progress */}
            {service.status !== 'cancelled' && <CaseTracker status={service.status} />}

            {/* Immediate Tag */}
            {service.isImmediate && (
                <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-sm) var(--space-md)', background: 'var(--bg-secondary)', border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }} />
                    IMMEDIATE SERVICE REQUESTED
                </div>
            )}

            {/* Details */}
            <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.875rem' }}>
                        <MapPin size={16} color="var(--text-muted)" style={{ marginTop: 2 }} />
                        <div>
                            <div>{service.location}</div>
                            {service.locationDetails && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                                    {service.locationDetails.details?.flat && `${service.locationDetails.details.flat}, `}
                                    {service.locationDetails.details?.floor && `${service.locationDetails.details.floor} Floor, `}
                                    {service.locationDetails.details?.landmark && `Near ${service.locationDetails.details.landmark}`}
                                </div>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem' }}>
                        <Clock size={16} color="var(--text-muted)" />
                        <span>
                            {service.isImmediate
                                ? `Requested: ${format(new Date(service.createdAt), 'MMM d, yyyy h:mm a')}`
                                : `Scheduled: ${format(new Date(service.scheduledTime), 'MMM d, yyyy h:mm a')}`}
                        </span>
                    </div>
                    <div style={{ padding: 'var(--space-md)', background: 'var(--bg)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
                        <strong>Symptoms:</strong> {service.symptoms}
                    </div>
                </div>
            </div>

            {/* Nurse */}
            {service.nurse && (
                <div className="card" style={{ marginTop: 'var(--space-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(15,185,177,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary)' }}>
                            <User size={18} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 600 }}>{service.nurse.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Assigned Nurse · 📞 {service.nurse.phone}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Clinical Report */}
            {service.clinicalReport && (
                <div className="card" style={{ marginTop: 'var(--space-md)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileText size={18} /> Vitals Report
                    </h3>
                    <div className="vitals-grid">
                        {Object.entries(service.clinicalReport.vitalsJson || {}).filter(([key, val]) => {
                            if (typeof val === 'string' && (val as string).startsWith('data:image')) return false;
                            if (typeof val === 'boolean') return false;
                            if (val === null || val === undefined || val === '') return false;
                            return true;
                        }).map(([key, val]) => (
                            <div key={key} className="vital-card">
                                <div className="vital-value">{val as string || '–'}</div>
                                <div className="vital-label">{key.replace(/([A-Z])/g, ' $1')}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: 'var(--space-md)', fontSize: '0.875rem' }}><strong>Assessment Notes:</strong> {service.clinicalReport.nurseNotes}</div>
                    {service.clinicalReport.chiefComplaint && (
                        <div style={{ marginTop: 8, fontSize: '0.875rem' }}><strong>Chief Complaint:</strong> {service.clinicalReport.chiefComplaint}</div>
                    )}
                </div>
            )}

            {/* Doctor Action */}
            {service.doctorAction && (
                <div className="card" style={{ marginTop: 'var(--space-md)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Stethoscope size={18} /> Doctor's Assessment
                    </h3>
                    <div style={{ fontSize: '0.875rem', marginBottom: 12 }}><strong>Diagnosis:</strong> {service.doctorAction.diagnosis}</div>
                    {service.doctorAction.advice && <div style={{ fontSize: '0.875rem', marginBottom: 12 }}><strong>Advice:</strong> {service.doctorAction.advice}</div>}
                    {service.doctorAction.medications && <div style={{ fontSize: '0.875rem', marginBottom: 12 }}><strong>Medications:</strong> {service.doctorAction.medications}</div>}
                    {service.doctorAction.referralNote && <div style={{ fontSize: '0.875rem', marginBottom: 12 }}><strong>Referral:</strong> {service.doctorAction.referralNote}</div>}
                    {service.doctorAction.followupDate && <div style={{ fontSize: '0.875rem' }}><strong>Follow-up:</strong> {format(new Date(service.doctorAction.followupDate), 'MMM d, yyyy')}</div>}
                </div>
            )}

            {/* ============ PRESCRIPTION ============ */}
            {prescription && (
                <div className="card" style={{ marginTop: 'var(--space-md)', borderLeft: '4px solid var(--primary)', background: 'hsl(174, 62%, 97%)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Pill size={18} /> Your Prescription is Ready
                        <span className="badge" style={{ background: 'var(--primary)', color: 'white', fontSize: '0.7rem' }}>v{prescription.versionNumber}</span>
                    </h3>

                    <div style={{ fontSize: '0.875rem', marginBottom: 12 }}><strong>Diagnosis:</strong> {prescription.diagnosis}</div>

                    {/* Vitals summary */}
                    {prescription.vitalsSnapshotJson && (
                        <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: '0.813rem', fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Activity size={14} /> Vitals Summary
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {Object.entries(prescription.vitalsSnapshotJson).filter(([key, val]) => {
                                    if (typeof val === 'string' && (val as string).startsWith('data:image')) return false;
                                    if (typeof val === 'boolean') return false;
                                    if (val === null || val === undefined || val === '') return false;
                                    return true;
                                }).map(([key, val]) => (
                                    <span key={key} style={{
                                        padding: '4px 10px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)',
                                        fontSize: '0.75rem', border: '1px solid var(--border)',
                                    }}>
                                        <strong>{key.replace(/([A-Z])/g, ' $1')}:</strong> {val as string}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Medicine table */}
                    {prescription.medicinesJson && (prescription.medicinesJson as any[]).length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.813rem' }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg)', textAlign: 'left' }}>
                                        <th style={{ padding: '6px 8px', borderBottom: '2px solid var(--border)' }}>#</th>
                                        <th style={{ padding: '6px 8px', borderBottom: '2px solid var(--border)' }}>Medicine</th>
                                        <th style={{ padding: '6px 8px', borderBottom: '2px solid var(--border)' }}>Dosage</th>
                                        <th style={{ padding: '6px 8px', borderBottom: '2px solid var(--border)' }}>Freq</th>
                                        <th style={{ padding: '6px 8px', borderBottom: '2px solid var(--border)' }}>Days</th>
                                        <th style={{ padding: '6px 8px', borderBottom: '2px solid var(--border)' }}>Timing</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(prescription.medicinesJson as any[]).map((m: any, i: number) => (
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

                    {prescription.followUpInstruction && (
                        <div style={{ fontSize: '0.875rem', marginBottom: 12 }}><strong>Follow-up:</strong> {prescription.followUpInstruction}</div>
                    )}

                    {prescription.pdfUrl && (
                        <a
                            href={`http://localhost:3001${prescription.pdfUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 8 }}
                        >
                            <Download size={16} /> Download Prescription PDF
                        </a>
                    )}
                </div>
            )}

            {/* Lab Orders */}
            {service.labOrders?.length > 0 && (
                <div className="card" style={{ marginTop: 'var(--space-md)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FlaskConical size={18} /> Lab Tests
                    </h3>
                    {service.labOrders.map((lo: any) => (
                        <div key={lo.id} style={{ padding: 'var(--space-md)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div style={{ fontWeight: 600 }}>{(lo.testsJson as any[])?.map((t: any) => t.name).join(', ')}</div>
                                <span className="badge badge-primary">{lo.status.replace(/_/g, ' ')}</span>
                            </div>
                            {lo.labReport && (
                                <a href={lo.labReport.reportUrl} target="_blank" rel="noopener" className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}>
                                    View Report
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
