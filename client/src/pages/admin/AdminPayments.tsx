import React, { useEffect, useState, useCallback } from 'react';
import { serviceApi } from '../../services/api';
import { DollarSign, TrendingUp, Calendar, CreditCard } from 'lucide-react';

export default function AdminPayments() {
    const [services, setServices] = useState<any[]>([]);
    const [range, setRange] = useState<'7d' | '30d' | 'all'>('30d');
    const load = useCallback(async () => { const { data } = await serviceApi.getAll(); setServices(data); }, []);
    useEffect(() => { load(); }, [load]);

    const now = Date.now();
    const rangeMs = range === '7d' ? 7 * 86400000 : range === '30d' ? 30 * 86400000 : Infinity;
    const filtered = services.filter(s => s.status === 'completed' && (now - new Date(s.createdAt).getTime()) < rangeMs);

    // Simple metrics
    const totalRevenue = filtered.length * 499; // placeholder; real revenue would come from pricing
    const avgTicket = filtered.length ? Math.round(totalRevenue / filtered.length) : 0;

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Payments & Finance</h1>
                <div style={{ display: 'flex', gap: 8 }}>
                    {(['7d', '30d', 'all'] as const).map(r => (
                        <button key={r} onClick={() => setRange(r)} style={{ padding: '6px 14px', border: '1px solid #E1E5EB', borderRadius: 8, cursor: 'pointer', background: range === r ? 'var(--primary)' : 'white', color: range === r ? 'white' : '#333', fontSize: 13 }}>{r === 'all' ? 'All Time' : `Last ${r.replace('d', ' days')}`}</button>
                    ))}
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
                <Card icon={<DollarSign />} label="Total Revenue" value={`₹${totalRevenue.toLocaleString()}`} color="#27AE60" />
                <Card icon={<CreditCard />} label="Completed Visit" value={filtered.length.toString()} color="#3498DB" />
                <Card icon={<TrendingUp />} label="Avg Ticket" value={`₹${avgTicket}`} color="#9B59B6" />
                <Card icon={<Calendar />} label="Period" value={range === 'all' ? 'All Time' : `Last ${range.replace('d', ' days')}`} color="#F39C12" />
            </div>
            <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: '#F8F9FB', borderBottom: '1px solid #E1E5EB' }}>
                        <th style={th}>Date</th><th style={th}>Patient</th><th style={th}>Service</th><th style={th}>Status</th><th style={th}>Amount</th>
                    </tr></thead>
                    <tbody>{filtered.slice(0, 50).map(s => (
                        <tr key={s.id} style={{ borderBottom: '1px solid #F0F1F3' }}>
                            <td style={td}>{new Date(s.createdAt).toLocaleDateString()}</td>
                            <td style={td}>{s.patient?.name || 'N/A'}</td>
                            <td style={td}>{s.serviceType}</td>
                            <td style={td}><span style={{ color: 'green', fontWeight: 600 }}>Completed</span></td>
                            <td style={td}><strong>₹499</strong></td>
                        </tr>
                    ))}</tbody>
                </table>
                {filtered.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>No completed visits in this period</div>}
            </div>
        </div>
    );
}

function Card({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
    return (
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
            <div><div style={{ fontSize: 12, color: '#6B7280' }}>{label}</div><div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div></div>
        </div>
    );
}

const th: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6B7280' };
const td: React.CSSProperties = { padding: '12px 16px', fontSize: 14 };
