import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { serviceApi, labApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import CaseTracker from '../components/CaseTracker';
import { Calendar, Plus, Clock, MapPin, ChevronRight, ChevronDown, FileText, Inbox, XCircle, FlaskConical, Star, X, Send, Download } from 'lucide-react';
import { format } from 'date-fns';
import RatingDialog from '../components/RatingDialog';
import UseCaseCarousel from '../components/UseCaseCarousel';
import { ratingApi, cmsApi, prescriptionApi } from '../services/api';
import { generatePrescriptionPDF } from '../services/prescriptionPdf';
import { UseCase } from '../../../shared/types';
import {
    QUICK_ACTIONS,
    SERVICE_CATEGORIES,
    SMART_SUGGESTIONS,
    TRUST_ELEMENTS,
    calculatePrice,
    getDisplayPrice,
    findServiceById,
    type ServiceOption,
    type ServiceCategory,
    type PriceBreakdown,
} from '../../../shared/patientDashboardConfig';

// ─── Status Labels ───
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

// ─── Tooltip Component ───
function Tooltip({ text }: { text: string }) {
    const [show, setShow] = useState(false);
    return (
        <span
            className="tooltip-wrap"
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
            onClick={(e) => { e.stopPropagation(); setShow(v => !v); }}
        >
            <span className="tooltip-icon">i</span>
            {show && <span className="tooltip-popup">{text}</span>}
        </span>
    );
}

// ─── Booking Drawer Component ───
interface DrawerProps {
    isOpen: boolean;
    service: ServiceOption | null;
    category: ServiceCategory | null;
    onClose: () => void;
    onBook: (serviceLabel: string, symptoms: string, addOns: ServiceOption[]) => void;
}

function BookingDrawer({ isOpen, service, category, onClose, onBook }: DrawerProps) {
    const [symptoms, setSymptoms] = useState('');
    const [complexityIndex, setComplexityIndex] = useState(0);
    const [addOns, setAddOns] = useState<ServiceOption[]>([]);
    const [loading, setLoading] = useState(false);

    // Reset state when service changes
    useEffect(() => {
        setSymptoms('');
        setComplexityIndex(0);
        setAddOns([]);
    }, [service?.id]);

    if (!isOpen || !service || !category) return null;

    const suggestions = SMART_SUGGESTIONS[service.id] || [];
    const pricing = calculatePrice(service, { complexityIndex, addOns });

    const handleAddSuggestion = (suggestedServiceId: string) => {
        const found = findServiceById(suggestedServiceId);
        if (found && !addOns.find(a => a.id === suggestedServiceId)) {
            setAddOns([...addOns, found.service]);
        }
    };

    const handleRemoveAddOn = (id: string) => {
        setAddOns(addOns.filter(a => a.id !== id));
    };

    const handleProceed = () => {
        setLoading(true);
        onBook(service.label, symptoms, addOns);
    };

    return (
        <>
            <div className="drawer-backdrop" onClick={onClose} />
            <div className="booking-drawer">
                <div className="drawer-handle" />
                <div className="drawer-header">
                    <div>
                        <h3>{service.label}</h3>
                        <span style={{ fontSize: '0.688rem', color: 'var(--text-muted)' }}>
                            {category.emoji} {category.title}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="drawer-scroll">
                    {/* Complexity Selector */}
                    {service.complexityOptions && service.complexityOptions.length > 0 && (
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                            <div className="section-label">Select Type</div>
                            <div className="complexity-selector">
                                {service.complexityOptions.map((opt, i) => (
                                    <div
                                        key={opt.label}
                                        className={`complexity-option ${complexityIndex === i ? 'selected' : ''}`}
                                        onClick={() => setComplexityIndex(i)}
                                    >
                                        <span className="complexity-option-label">{opt.label}</span>
                                        <span className="complexity-option-price">₹{opt.price}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Price Breakdown */}
                    <div className="section-label">💰 Price Breakdown</div>
                    <div className="price-breakdown">
                        {pricing.lineItems.map((item, i) => (
                            <div key={i} className="price-line">
                                <span>{item.label}</span>
                                <span className={item.isDiscount ? 'discount' : ''}>
                                    {item.isDiscount ? '-' : ''}₹{item.amount}
                                </span>
                            </div>
                        ))}
                        <div className="price-line total">
                            <span>Total</span>
                            <span>₹{pricing.total}</span>
                        </div>
                    </div>

                    {/* Smart Suggestions */}
                    {suggestions.length > 0 && (
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                            <div className="section-label">💡 Recommended</div>
                            {suggestions.map((s) => {
                                const alreadyAdded = addOns.find(a => a.id === s.suggestedServiceId);
                                return (
                                    <div
                                        key={s.suggestedServiceId}
                                        className="smart-suggestion"
                                        onClick={() => !alreadyAdded && handleAddSuggestion(s.suggestedServiceId)}
                                        style={{ opacity: alreadyAdded ? 0.5 : 1 }}
                                    >
                                        <span className="smart-suggestion-text">{s.message}</span>
                                        <span className="smart-suggestion-add">
                                            {alreadyAdded ? '✓ Added' : `+ ₹${s.suggestedPrice}`}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Added Add-ons */}
                    {addOns.length > 0 && (
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                            <div className="section-label">🧾 Add-ons</div>
                            {addOns.map(addon => (
                                <div key={addon.id} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--success-bg)',
                                    marginBottom: 4
                                }}>
                                    <span style={{ fontSize: '0.813rem', fontWeight: 500 }}>{addon.label}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)' }}>₹{addon.basePrice}</span>
                                        <button
                                            onClick={() => handleRemoveAddOn(addon.id)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Symptoms */}
                    <div style={{ marginBottom: 'var(--space-md)' }}>
                        <div className="section-label">📝 Symptoms (optional)</div>
                        <textarea
                            className="form-textarea"
                            placeholder="Describe your symptoms briefly..."
                            value={symptoms}
                            onChange={(e) => setSymptoms(e.target.value)}
                            style={{ minHeight: 70, fontSize: '0.875rem' }}
                        />
                    </div>
                </div>

                {/* Sticky Bottom */}
                <div className="sticky-bottom-bar">
                    <div className="sticky-bottom-total">
                        <span>Total</span>
                        <strong>₹{pricing.total}</strong>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={handleProceed}
                        disabled={loading}
                        style={{
                            background: 'linear-gradient(135deg, #F25022, #D83B01)',
                            minHeight: 48, borderRadius: 'var(--radius-md)',
                            fontSize: '0.875rem', gap: 8, paddingLeft: 24, paddingRight: 24
                        }}
                    >
                        {loading ? <div className="spinner" style={{ width: 18, height: 18 }} /> : (
                            <>
                                <Send size={16} />
                                Proceed to Book
                            </>
                        )}
                    </button>
                </div>
            </div>
        </>
    );
}

// ═══════════════════════════════════════════
//  MAIN DASHBOARD
// ═══════════════════════════════════════════

export default function PatientDashboard() {
    const [services, setServices] = useState<any[]>([]);
    const [labOrders, setLabOrders] = useState<any[]>([]);
    const [useCases, setUseCases] = useState<UseCase[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [ratingConfig, setRatingConfig] = useState<{ isOpen: boolean; serviceId: string; toUserId: string; title: string, categories: string[] }>({
        isOpen: false, serviceId: '', toUserId: '', title: '', categories: []
    });

    // Accordion state
    const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);

    // Booking drawer state
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<ServiceOption | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);

    const { user } = useAuth();
    const { socket } = useSocket();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const fetchData = useCallback(async () => {
        try {
            const [servRes, labRes, ucRes] = await Promise.all([
                serviceApi.getMy(),
                labApi.getPatientOrders(user!.id),
                cmsApi.getActiveUseCases(),
            ]);
            setServices(servRes.data);
            setLabOrders(labRes.data);
            setUseCases(ucRes.data);
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

    // ─── Quick Action / Service Selection ───
    const openBookingDrawer = (serviceId: string) => {
        const found = findServiceById(serviceId);
        if (found) {
            setSelectedService(found.service);
            setSelectedCategory(found.category);
            setDrawerOpen(true);
        }
    };

    const handleQuickAction = (categoryId: string, serviceId: string) => {
        // Open the category accordion for context, then open drawer
        setOpenCategoryId(categoryId);
        openBookingDrawer(serviceId);
    };

    const handleBookFromDrawer = (serviceLabel: string, symptoms: string, _addOns: ServiceOption[]) => {
        // Navigate to BookVisit with pre-selected service
        navigate('/patient/book', {
            state: {
                preSelectedService: serviceLabel,
                symptoms: symptoms,
            }
        });
    };

    // ─── Derived Data ───
    const activeCase = services.find((s) => !['completed', 'cancelled'].includes(s.status));
    const history = services.filter((s) => ['completed', 'cancelled'].includes(s.status));
    const pendingLabs = labOrders.filter((l) => l.status === 'pending_patient_confirmation');

    if (loading) return <div className="loading-page"><div className="spinner" /></div>;

    return (
        <div>
            {/* ─── Header ─── */}
            <div className="page-header" style={{ marginBottom: 'var(--space-lg)' }}>
                <h1 className="page-title" style={{ fontSize: 'clamp(1.25rem, 5vw, 1.75rem)' }}>Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
                <p className="page-subtitle" style={{ fontSize: '0.875rem' }}>Book services, track visits, and stay updated.</p>
            </div>

            {/* ─── Use Case Carousel ─── */}
            <UseCaseCarousel useCases={useCases} />

            {/* ─── Active Case Tracker ─── */}
            {activeCase && (
                <div style={{ marginBottom: 'var(--space-xl)' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="status-dot active" /> Active Case
                    </h2>
                    <div className="card" style={{ cursor: 'pointer', padding: 'var(--space-md)' }} onClick={() => navigate(`/patient/service/${activeCase.id}`)}>
                        <div style={{ overflowX: 'auto', marginBottom: 'var(--space-md)' }}>
                            <CaseTracker status={activeCase.status} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.938rem' }}>{activeCase.serviceType}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                    <MapPin size={12} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>{activeCase.location}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                {CANCELLABLE.includes(activeCase.status) && (
                                    <button
                                        className="btn btn-sm desktop-only"
                                        style={{ color: 'var(--critical)', borderColor: 'var(--critical)', background: 'transparent' }}
                                        onClick={(e) => { e.stopPropagation(); handleCancel(activeCase.id); }}
                                        disabled={cancelling}
                                    >
                                        <XCircle size={14} /> {cancelling ? '...' : 'Cancel'}
                                    </button>
                                )}
                                <ChevronRight size={20} color="var(--text-muted)" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Pending Lab Confirmations ─── */}
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

            {/* ─── Lab Reports ─── */}
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

            {/* ═══════════════════════════════════════════ */}
            {/* SECTION 1: QUICK ACTIONS                   */}
            {/* ═══════════════════════════════════════════ */}
            <div style={{ marginBottom: 'var(--space-xl)' }}>
                <h2 className="section-label">⚡ Quick Actions</h2>
                <div className="quick-actions">
                    {QUICK_ACTIONS.map((qa) => (
                        <div
                            key={qa.id}
                            className="quick-action-pill"
                            onClick={() => handleQuickAction(qa.categoryId, qa.serviceId)}
                        >
                            <span className="pill-emoji">{qa.emoji}</span>
                            <span className="pill-label">{qa.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══════════════════════════════════════════ */}
            {/* SECTION 2: SERVICE CATEGORIES ACCORDION     */}
            {/* ═══════════════════════════════════════════ */}
            <div style={{ marginBottom: 'var(--space-xl)' }}>
                <h2 className="section-label">🏥 What Do You Need Help With?</h2>
                <div className="accordion-section">
                    {SERVICE_CATEGORIES.map((cat) => {
                        const isOpen = openCategoryId === cat.id;
                        return (
                            <div
                                key={cat.id}
                                className={`accordion-card ${isOpen ? 'open' : ''}`}
                                style={{ borderLeft: `4px solid ${cat.color}` }}
                            >
                                <button
                                    className="accordion-header"
                                    onClick={() => setOpenCategoryId(isOpen ? null : cat.id)}
                                    style={isOpen ? { background: cat.colorLight } : undefined}
                                >
                                    <div className="accordion-header-left">
                                        <span className="acc-emoji">{cat.emoji}</span>
                                        <span className="acc-title">{cat.title}</span>
                                    </div>
                                    <ChevronDown size={18} className="accordion-chevron" />
                                </button>
                                <div className="accordion-body" style={isOpen ? { background: cat.colorLight } : undefined}>
                                    <div className="accordion-body-inner">
                                        {cat.services.map((svc) => (
                                            <div
                                                key={svc.id}
                                                className="service-option"
                                                onClick={() => openBookingDrawer(svc.id)}
                                            >
                                                <div className="service-option-left">
                                                    <span className="service-option-label">{svc.label}</span>
                                                    {svc.tooltip && <Tooltip text={svc.tooltip} />}
                                                </div>
                                                <span className="service-option-price">{getDisplayPrice(svc)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ═══════════════════════════════════════════ */}
            {/* TRUST ELEMENTS                              */}
            {/* ═══════════════════════════════════════════ */}
            <div style={{ marginBottom: 'var(--space-xl)' }}>
                <h2 className="section-label">🔒 Why Immidit?</h2>
                <div className="trust-badges">
                    {TRUST_ELEMENTS.map((te, i) => (
                        <div key={i} className="trust-badge">
                            <span className="trust-emoji">{te.emoji}</span>
                            <span className="trust-text">{te.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══════════════════════════════════════════ */}
            {/* VISIT HISTORY                              */}
            {/* ═══════════════════════════════════════════ */}
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
                            <div key={s.id} className="card history-card" style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 'var(--space-md)',
                                flexWrap: 'wrap'
                            }}>
                                <div style={{ cursor: 'pointer', flex: '1 1 200px', minWidth: 0 }} onClick={() => navigate(`/patient/service/${s.id}`)}>
                                    <div style={{ fontWeight: 700, fontSize: '0.938rem', marginBottom: 2 }}>{s.serviceType}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Clock size={12} /> {format(new Date(s.createdAt), 'MMM d, yyyy')}
                                        </div>
                                        <span className={`badge ${s.status === 'completed' ? 'badge-mild' : 'badge-severe'}`} style={{ fontSize: '0.688rem', padding: '2px 8px' }}>
                                            {s.status === 'completed' ? 'Completed' : 'Cancelled'}
                                        </span>
                                    </div>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    gap: 8,
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    justifyContent: 'flex-end',
                                    flex: '1 1 auto'
                                }}>
                                    {s.status === 'completed' && (
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                            {s.nurseId && (
                                                <button
                                                    className="btn btn-ghost btn-xs"
                                                    style={{ gap: 4, height: 28, fontSize: '0.75rem', padding: '0 8px', background: 'var(--primary-bg)', color: 'var(--primary)', border: 'none' }}
                                                    onClick={() => setRatingConfig({
                                                        isOpen: true,
                                                        serviceId: s.id,
                                                        toUserId: s.nurseId,
                                                        title: `Rate Nurse: ${s.nurse?.name || 'Assigned Nurse'}`,
                                                        categories: ['Behavior', 'Punctuality', 'Medical Skill', 'Painless Treatment']
                                                    })}
                                                >
                                                    <Star size={12} fill="currentColor" /> Rate Nurse
                                                </button>
                                            )}
                                            {s.doctorId && (
                                                <button
                                                    className="btn btn-ghost btn-xs"
                                                    style={{ gap: 4, height: 28, fontSize: '0.75rem', padding: '0 8px', background: 'var(--primary-bg)', color: 'var(--primary)', border: 'none' }}
                                                    onClick={() => setRatingConfig({
                                                        isOpen: true,
                                                        serviceId: s.id,
                                                        toUserId: s.doctorId,
                                                        title: `Rate Doctor: ${s.doctor?.name || 'Medical Officer'}`,
                                                        categories: ['Communication', 'Accuracy', 'Advice Helpfulness']
                                                    })}
                                                >
                                                    <Star size={12} fill="currentColor" /> Rate Doctor
                                                </button>
                                            )}
                                            {s.prescriptions && s.prescriptions.length > 0 && (
                                                <>
                                                    <button
                                                        className="btn btn-primary btn-xs"
                                                        onClick={(e) => { e.stopPropagation(); generatePrescriptionPDF(s.prescriptions[0]); }}
                                                        style={{ gap: 4, height: 28, fontSize: '0.75rem', padding: '0 8px' }}
                                                    >
                                                        <Download size={12} /> Download Rx
                                                    </button>
                                                    <button
                                                        className="btn btn-secondary btn-xs"
                                                        onClick={(e) => { e.stopPropagation(); navigate(`/patient/service/${s.id}`); }}
                                                        style={{ gap: 4, height: 28, fontSize: '0.75rem', padding: '0 8px' }}
                                                    >
                                                        <FileText size={12} /> View Rx
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate(`/patient/service/${s.id}`)}>
                                        <ChevronRight size={20} color="var(--text-muted)" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Booking Drawer ─── */}
            <BookingDrawer
                isOpen={drawerOpen}
                service={selectedService}
                category={selectedCategory}
                onClose={() => setDrawerOpen(false)}
                onBook={handleBookFromDrawer}
            />

            {/* ─── Rating Dialog ─── */}
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
