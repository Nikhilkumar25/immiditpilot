import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { labApi } from '../services/api';
import {
    FileText, Download, FlaskConical, Inbox,
    RefreshCw, Clock, User, AlertCircle, Microscope,
    ExternalLink, Loader2,
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<string, { label: string; cls: string; color: string }> = {
    pending_patient_confirmation: { label: 'Awaiting Confirmation', cls: 'badge-moderate', color: 'var(--warning)' },
    pending_sample_collection: { label: 'Awaiting Sample', cls: 'badge-moderate', color: 'var(--warning)' },
    sample_collected: { label: 'Sample Collected', cls: 'badge-primary', color: 'var(--primary)' },
    received_at_lab: { label: 'Processing', cls: 'badge-info', color: 'var(--secondary)' },
    report_ready: { label: 'Report Ready', cls: 'badge-mild', color: 'var(--success)' },
    reviewed: { label: 'Reviewed', cls: 'badge-mild', color: 'var(--success)' },
    lab_closed: { label: 'Closed', cls: '', color: 'var(--text-muted)' },
};

export default function PatientLabReports() {
    const { user } = useAuth();
    const { socket } = useSocket();
    const { addToast } = useToast();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState<string | null>(null);

    const fetchOrders = useCallback(async () => {
        try {
            const res = await labApi.getPatientOrders(user!.id);
            setOrders(res.data);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    useEffect(() => {
        if (!socket) return;
        socket.on('report_uploaded', () => { addToast('success', 'Lab report is ready!'); fetchOrders(); });
        socket.on('lab_order_created', () => { addToast('info', 'New lab order created'); fetchOrders(); });
        socket.on('status_update', () => fetchOrders());
        return () => { socket.off('report_uploaded'); socket.off('lab_order_created'); socket.off('status_update'); };
    }, [socket, fetchOrders, addToast]);

    const openReport = async (labOrderId: string) => {
        try {
            setDownloading(labOrderId);
            const res = await labApi.getReportUrl(labOrderId);
            window.open(res.data.url, '_blank');
        } catch {
            addToast('error', 'Failed to load report');
        } finally {
            setDownloading(null);
        }
    };

    const readyReports = orders.filter(o => ['report_ready', 'reviewed', 'lab_closed'].includes(o.status) && o.labReport?.reportUrl);
    const pendingOrders = orders.filter(o => !['report_ready', 'reviewed', 'lab_closed'].includes(o.status));

    if (loading) return <div className="loading-page"><div className="spinner" /></div>;

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontSize: '1.375rem', fontWeight: 700, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <FlaskConical size={20} /> Lab Reports
                    </h1>
                    <p style={{ fontSize: '0.813rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                        {readyReports.length} report{readyReports.length !== 1 ? 's' : ''} available · {orders.length} total
                    </p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={fetchOrders}>
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {orders.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)',
                }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: '50%', background: 'var(--bg)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px', color: 'var(--text-muted)',
                    }}>
                        <Inbox size={28} />
                    </div>
                    <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>No lab orders yet</p>
                    <p style={{ fontSize: '0.813rem' }}>When your doctor recommends lab tests, they'll appear here.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {/* Ready Reports Section */}
                    {readyReports.length > 0 && (
                        <div>
                            <h2 style={{
                                fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)',
                                textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12,
                            }}>
                                Available Reports
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {readyReports.map((order) => {
                                    const tests = Array.isArray(order.testsJson)
                                        ? order.testsJson.map((t: any) => t.name || t).join(', ')
                                        : 'Lab Test';
                                    const isDownloading = downloading === order.id;

                                    return (
                                        <div key={order.id} style={{
                                            background: 'white',
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-lg)',
                                            padding: '16px 20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 14,
                                            transition: 'box-shadow 0.2s ease',
                                        }}>
                                            {/* Icon */}
                                            <div style={{
                                                width: 42, height: 42, borderRadius: 12,
                                                background: 'linear-gradient(135deg, rgba(30, 111, 251, 0.08), rgba(15, 185, 177, 0.06))',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: 'var(--primary)', flexShrink: 0,
                                            }}>
                                                <FileText size={20} />
                                            </div>

                                            {/* Content */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontWeight: 600, fontSize: '0.875rem',
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                    letterSpacing: '-0.01em',
                                                }}>
                                                    {tests}
                                                </div>
                                                <div style={{
                                                    fontSize: '0.75rem', color: 'var(--text-muted)',
                                                    display: 'flex', alignItems: 'center', gap: 6, marginTop: 3,
                                                }}>
                                                    <Clock size={11} />
                                                    {format(new Date(order.createdAt), 'MMM d, yyyy')}
                                                    {order.doctor && (
                                                        <>
                                                            <span style={{ color: 'var(--border)' }}>·</span>
                                                            <User size={11} />
                                                            Dr. {order.doctor.name}
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action buttons */}
                                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                                <button
                                                    className="btn btn-sm"
                                                    style={{
                                                        background: 'var(--primary-bg)', color: 'var(--primary)',
                                                        border: 'none', fontWeight: 600, gap: 4,
                                                    }}
                                                    onClick={() => openReport(order.id)}
                                                >
                                                    <ExternalLink size={13} /> View
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Pending Orders Section */}
                    {pendingOrders.length > 0 && (
                        <div>
                            <h2 style={{
                                fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)',
                                textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12,
                            }}>
                                In Progress
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {pendingOrders.map((order) => {
                                    const badge = STATUS_CONFIG[order.status] || { label: order.status.replace(/_/g, ' '), cls: '', color: 'var(--text-muted)' };
                                    const tests = Array.isArray(order.testsJson)
                                        ? order.testsJson.map((t: any) => t.name || t).join(', ')
                                        : 'Lab Test';

                                    return (
                                        <div key={order.id} style={{
                                            background: 'white',
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-lg)',
                                            padding: '14px 18px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 14,
                                        }}>
                                            {/* Status indicator */}
                                            <div style={{
                                                width: 38, height: 38, borderRadius: 10,
                                                background: 'var(--bg)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: 'var(--text-muted)', flexShrink: 0,
                                            }}>
                                                <Microscope size={18} />
                                            </div>

                                            {/* Content */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontWeight: 600, fontSize: '0.875rem',
                                                    display: 'flex', alignItems: 'center', gap: 8,
                                                    letterSpacing: '-0.01em',
                                                }}>
                                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {tests}
                                                    </span>
                                                    {order.urgency === 'high' && (
                                                        <span style={{
                                                            fontSize: '0.625rem', fontWeight: 700, color: 'var(--critical)',
                                                            background: 'var(--critical-bg)', padding: '2px 6px',
                                                            borderRadius: 'var(--radius-full)', textTransform: 'uppercase',
                                                            letterSpacing: '0.3px', flexShrink: 0,
                                                        }}>
                                                            Urgent
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{
                                                    fontSize: '0.75rem', color: 'var(--text-muted)',
                                                    display: 'flex', alignItems: 'center', gap: 6, marginTop: 3,
                                                }}>
                                                    <Clock size={11} />
                                                    {format(new Date(order.createdAt), 'MMM d, yyyy')}
                                                </div>
                                            </div>

                                            {/* Status badge */}
                                            <span style={{
                                                fontSize: '0.688rem', fontWeight: 600,
                                                color: badge.color, background: `${badge.color}10`,
                                                padding: '4px 10px', borderRadius: 'var(--radius-full)',
                                                letterSpacing: '0.2px', flexShrink: 0, whiteSpace: 'nowrap',
                                            }}>
                                                {badge.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
