import React, { useEffect, useState, useCallback } from 'react';
import { serviceApi, adminApi } from '../../services/api';
import { RefreshCw, MapPin, Clock, User2, AlertCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function AdminLiveOps() {
    const [services, setServices] = useState<any[]>([]);
    const [nurses, setNurses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [assigningId, setAssigningId] = useState<string | null>(null);
    const [selectedNurseId, setSelectedNurseId] = useState('');
    const { addToast } = useToast();

    const load = useCallback(async () => {
        try {
            const [servRes, nurseRes] = await Promise.all([
                serviceApi.getAll(),
                adminApi.getUsers('nurse')
            ]);
            setServices(servRes.data);
            setNurses(nurseRes.data);
        } catch (err) {
            addToast('error', 'Failed to refresh live ops');
        } finally { setLoading(false); }
    }, [addToast]);

    useEffect(() => { load(); const timer = setInterval(load, 15000); return () => clearInterval(timer); }, [load]);

    const handleAssign = async (serviceId: string) => {
        if (!selectedNurseId) return;
        console.log(`Assigning nurse ${selectedNurseId} to service ${serviceId}`);
        try {
            await adminApi.assignNurse(serviceId, selectedNurseId);
            addToast('success', 'Nurse assigned successfully');
            setAssigningId(null);
            setSelectedNurseId('');
            load();
        } catch (err: any) {
            console.error('Assignment failed:', err);
            const msg = err.response?.data?.error || 'Failed to assign nurse';
            addToast('error', msg);
        }
    };

    const active = services.filter(s => !['completed', 'cancelled'].includes(s.status));
    const byStatus: Record<string, any[]> = {};
    active.forEach(s => { (byStatus[s.status] = byStatus[s.status] || []).push(s); });

    const statusColors: Record<string, string> = {
        pending_nurse_assignment: '#F39C12',
        nurse_assigned: '#3498DB',
        nurse_en_route: '#9B59B6',
        nurse_arrived: '#1ABC9C',
        vitals_in_progress: '#E91E63',
        pending_doctor_review: '#E74C3C',
        doctor_reviewing: '#FF6B6B',
        doctor_completed: '#2ECC71',
        lab_pending: '#F39C12',
        completed: '#27AE60',
    };

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Live Operations</h1>
                <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: '1px solid #E1E5EB', borderRadius: 8, cursor: 'pointer', background: 'white', fontSize: 13 }}><RefreshCw size={14} /> Refresh</button>
            </div>

            {/* Status summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
                {Object.entries(byStatus).map(([status, items]) => (
                    <div key={status} style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: `4px solid ${statusColors[status] || '#999'}` }}>
                        <div style={{ fontSize: 24, fontWeight: 700 }}>{items.length}</div>
                        <div style={{ fontSize: 12, color: '#6B7280', textTransform: 'capitalize' }}>{status.replace(/_/g, ' ')}</div>
                    </div>
                ))}
                {active.length === 0 && <div style={{ gridColumn: '1/-1', padding: 40, textAlign: 'center', color: '#999' }}>No active operations</div>}
            </div>

            {/* Active cases list */}
            <div style={{ display: 'grid', gap: 12 }}>
                {active.map(s => (
                    <div key={s.id} style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 16, borderLeft: `4px solid ${statusColors[s.status] || '#999'}`, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>{s.serviceType}</div>
                            <div style={{ fontSize: 12, color: '#6B7280', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User2 size={12} /> {s.patient?.name || 'N/A'}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {s.location?.substring(0, 30) || 'N/A'}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {new Date(s.scheduledTime).toLocaleTimeString()}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${statusColors[s.status] || '#999'}20`, color: statusColors[s.status] || '#999', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{s.status.replace(/_/g, ' ')}</span>

                            {s.nurse && <span style={{ fontSize: 12, color: '#6B7280' }}>👩‍⚕️ {s.nurse.name}</span>}

                            {s.status === 'pending_nurse_assignment' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {assigningId === s.id ? (
                                        <>
                                            <select
                                                value={selectedNurseId}
                                                onChange={e => setSelectedNurseId(e.target.value)}
                                                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #E1E5EB', fontSize: 12 }}
                                            >
                                                <option value="">Select Nurse...</option>
                                                {nurses.map(n => (
                                                    <option key={n.id} value={n.id}>{n.name}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => handleAssign(s.id)}
                                                disabled={!selectedNurseId}
                                                style={{ padding: '4px 12px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', opacity: selectedNurseId ? 1 : 0.5 }}
                                            >
                                                Assign
                                            </button>
                                            <button
                                                onClick={() => setAssigningId(null)}
                                                style={{ padding: '4px 8px', background: 'none', border: 'none', color: '#6B7280', fontSize: 12, cursor: 'pointer' }}
                                            >
                                                Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => setAssigningId(s.id)}
                                            style={{ padding: '6px 12px', background: '#34495E', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                                        >
                                            Assign Nurse
                                        </button>
                                    )}
                                </div>
                            )}

                            {s.isImmediate && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#FFEBEE', color: '#E74C3C', fontWeight: 600 }}>⚡ INSTANT</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
