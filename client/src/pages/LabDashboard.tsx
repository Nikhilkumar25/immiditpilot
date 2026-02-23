import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import {
    CheckCircle2,
    Clock,
    FileText,
    Microscope,
    Upload,
    User,
    AlertCircle,
    Inbox,
    RefreshCw,
    X,
} from 'lucide-react';

interface LabOrder {
    id: string;
    serviceId: string;
    patientId: string;
    doctorId: string;
    testsJson: any;
    urgency: string;
    status: string;
    collectionTime: string | null;
    createdAt: string;
    patient: { id: string; name: string; phone?: string };
    doctor: { id: string; name: string };
    labReport?: { id: string; reportUrl: string };
}

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
    pending_sample_collection: { label: 'Awaiting Sample', cls: 'badge-warning' },
    pending_patient_confirmation: { label: 'Awaiting Confirmation', cls: 'badge-info' },
    sample_collected: { label: 'Sample Collected', cls: 'badge-primary' },
    received_at_lab: { label: 'Received at Lab', cls: 'badge-success' },
    report_ready: { label: 'Report Ready', cls: 'badge-mild' },
    reviewed: { label: 'Reviewed', cls: 'badge-mild' },
    lab_closed: { label: 'Closed', cls: '' },
};

export default function LabDashboard() {
    const { user } = useAuth();
    const { socket } = useSocket();
    const { addToast } = useToast();
    const [orders, setOrders] = useState<LabOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
    const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
    const [reportUrl, setReportUrl] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const fetchOrders = useCallback(async () => {
        try {
            const res = await api.get('/lab/queue');
            setOrders(res.data);
        } catch (err) {
            console.error('Failed to fetch lab queue:', err);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    useEffect(() => {
        if (!socket) return;
        socket.on('lab_order_created', () => { addToast('info', 'New lab order'); fetchOrders(); });
        socket.on('status_update', () => fetchOrders());
        socket.on('report_uploaded', () => fetchOrders());
        return () => { socket.off('lab_order_created'); socket.off('status_update'); socket.off('report_uploaded'); };
    }, [socket, fetchOrders, addToast]);

    const handleUploadReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrder) return;
        if (!file) {
            addToast('error', 'Please select a file to upload');
            return;
        }
        setUploading(true);
        try {
            // Upload file to GCS, get back persistent fileId
            const formData = new FormData();
            formData.append('file', file);
            const uploadRes = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const fileId = uploadRes.data.fileId;

            // Link the fileId to the lab order report
            await api.post(`/lab/order/${selectedOrder.id}/report`, { fileId });
            addToast('success', 'Report uploaded successfully');
            setReportUrl('');
            setFile(null);
            setSelectedOrder(null);
            fetchOrders();
        } catch (err) {
            console.error('Upload failed:', err);
            addToast('error', 'Failed to upload report');
        } finally {
            setUploading(false);
        }
    };

    const handleReceiveSample = async (id: string) => {
        try {
            await api.patch(`/lab/order/${id}/receive`);
            addToast('success', 'Sample received at lab');
            fetchOrders();
        } catch (err) {
            console.error('Failed to receive sample:', err);
            addToast('error', 'Failed to confirm receipt');
        }
    };

    const pendingOrders = orders.filter(o => ['pending_sample_collection', 'pending_patient_confirmation', 'sample_collected', 'received_at_lab'].includes(o.status));
    const completedOrders = orders.filter(o => ['report_ready', 'reviewed', 'lab_closed'].includes(o.status));
    const displayOrders = activeTab === 'pending' ? pendingOrders : completedOrders;

    if (loading) return <div className="loading-page"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">Lab Dashboard</h1>
                    <p className="page-subtitle">{pendingOrders.length} pending · {completedOrders.length} completed</p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={fetchOrders}><RefreshCw size={14} /> Refresh</button>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pending')}>
                    Pending ({pendingOrders.length})
                </button>
                <button className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('completed')}>
                    Completed ({completedOrders.length})
                </button>
            </div>

            {/* Orders */}
            {displayOrders.length === 0 ? (
                <div className="empty-state">
                    <Inbox size={48} className="empty-state-icon" />
                    <p>No {activeTab} orders.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                    {displayOrders.map((order) => {
                        const badge = STATUS_BADGES[order.status] || { label: order.status.replace(/_/g, ' '), cls: '' };
                        return (
                            <div key={order.id} className="card"
                                style={{
                                    borderLeft: order.urgency === 'high' ? '4px solid var(--critical)' : undefined,
                                }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                    <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 'var(--radius-md)',
                                            background: 'var(--primary-bg)', display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', color: 'var(--primary)', flexShrink: 0,
                                        }}>
                                            <User size={18} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                {order.patient?.name}
                                                {order.urgency === 'high' && (
                                                    <span className="badge badge-severe" style={{ fontSize: '0.688rem' }}>
                                                        <AlertCircle size={10} /> URGENT
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                Ref: Dr. {order.doctor?.name} · {new Date(order.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                        <span className={`badge ${badge.cls}`}>{badge.label}</span>
                                    </div>
                                </div>

                                {/* Tests */}
                                <div style={{
                                    marginTop: 'var(--space-md)', padding: 'var(--space-sm) var(--space-md)',
                                    background: 'var(--bg)', borderRadius: 'var(--radius-md)', fontSize: '0.813rem',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: 'var(--text-secondary)' }}>
                                        <Microscope size={14} /> <strong>Tests:</strong>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                        {Array.isArray(order.testsJson) && order.testsJson.map((test: any, i: number) => (
                                            <span key={i} style={{
                                                padding: '2px 8px', background: 'var(--card-bg)', border: '1px solid var(--border)',
                                                borderRadius: 'var(--radius-sm)', fontSize: '0.75rem',
                                            }}>
                                                {test.name || test}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ marginTop: 'var(--space-md)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                    {order.status === 'sample_collected' && (
                                        <button className="btn btn-secondary btn-sm"
                                            onClick={() => handleReceiveSample(order.id)}>
                                            <CheckCircle2 size={14} /> Confirm Receipt
                                        </button>
                                    )}
                                    {order.status === 'received_at_lab' && (
                                        <button className="btn btn-primary btn-sm"
                                            onClick={() => setSelectedOrder(order)}>
                                            <Upload size={14} /> Upload Report
                                        </button>
                                    )}
                                    {order.status === 'report_ready' && order.labReport?.reportUrl && (
                                        <button onClick={async () => {
                                            try {
                                                const res = await (await import('../services/api')).labApi.getReportUrl(order.id);
                                                window.open(res.data.url, '_blank');
                                            } catch { }
                                        }} className="btn btn-secondary btn-sm">
                                            <FileText size={14} /> View Report
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Upload Modal */}
            {selectedOrder && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16,
                }}>
                    <div className="card" style={{ maxWidth: 440, width: '100%', position: 'relative' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelectedOrder(null)}
                            style={{ position: 'absolute', top: 12, right: 12 }}>
                            <X size={18} />
                        </button>

                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 4 }}>Upload Lab Report</h3>
                        <p style={{ fontSize: '0.813rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
                            Report for <strong>{selectedOrder.patient?.name}</strong>
                        </p>

                        <form onSubmit={handleUploadReport}>
                            <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                                <label className="form-label">Upload File (PDF or Image)</label>
                                <div style={{
                                    border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)',
                                    padding: 'var(--space-lg)', textAlign: 'center', cursor: 'pointer',
                                    position: 'relative', background: 'var(--bg)',
                                }}>
                                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                                    <Upload size={24} color="var(--text-muted)" style={{ marginBottom: 8 }} />
                                    <p style={{ fontSize: '0.813rem', color: 'var(--text-secondary)' }}>
                                        {file ? file.name : 'Click to select file'}
                                    </p>
                                </div>
                            </div>

                            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', margin: '8px 0' }}>— OR —</div>

                            <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
                                <label className="form-label">Report URL</label>
                                <input type="url" className="form-input" placeholder="https://..."
                                    value={reportUrl} onChange={(e) => setReportUrl(e.target.value)} />
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                <button type="button" className="btn btn-secondary" style={{ flex: 1 }}
                                    onClick={() => setSelectedOrder(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}
                                    disabled={uploading}>
                                    {uploading ? 'Uploading...' : 'Submit Report'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
