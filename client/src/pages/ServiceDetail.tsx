import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { serviceApi } from '../services/api';
import CaseTracker from '../components/CaseTracker';
import { ArrowLeft, User, MapPin, Clock, FileText, Stethoscope, FlaskConical } from 'lucide-react';
import { format } from 'date-fns';

export default function ServiceDetail() {
    const { id } = useParams<{ id: string }>();
    const [service, setService] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        serviceApi.getById(id!).then((res) => setService(res.data)).catch(console.error).finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div className="loading-page"><div className="spinner" /></div>;
    if (!service) return <div className="empty-state"><p>Service not found.</p></div>;

    return (
        <div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/patient')} style={{ marginBottom: 'var(--space-md)' }}>
                <ArrowLeft size={16} /> Back
            </button>

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
                        {Object.entries(service.clinicalReport.vitalsJson || {}).map(([key, val]) => (
                            <div key={key} className="vital-card">
                                <div className="vital-value">{val as string || '–'}</div>
                                <div className="vital-label">{key.replace(/([A-Z])/g, ' $1')}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: 'var(--space-md)', fontSize: '0.875rem' }}><strong>Notes:</strong> {service.clinicalReport.nurseNotes}</div>
                </div>
            )}

            {/* Doctor Action */}
            {service.doctorAction && (
                <div className="card" style={{ marginTop: 'var(--space-md)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Stethoscope size={18} /> Doctor's Assessment
                    </h3>
                    <div style={{ fontSize: '0.875rem', marginBottom: 8 }}><strong>Diagnosis:</strong> {service.doctorAction.diagnosis}</div>
                    {service.doctorAction.referralNote && <div style={{ fontSize: '0.875rem', marginBottom: 8 }}><strong>Referral:</strong> {service.doctorAction.referralNote}</div>}
                    {service.doctorAction.followupDate && <div style={{ fontSize: '0.875rem' }}><strong>Follow-up:</strong> {format(new Date(service.doctorAction.followupDate), 'MMM d, yyyy')}</div>}
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
