import React, { useEffect, useState, useCallback } from 'react';
import { cmsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export default function AdminPricing() {
    const [rules, setRules] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [zones, setZones] = useState<any[]>([]);
    const [editing, setEditing] = useState<any>(null);
    const [showForm, setShowForm] = useState(false);
    const { addToast } = useToast();

    const load = useCallback(async () => {
        const [r, s, z] = await Promise.all([cmsApi.getPricingRules(), cmsApi.getServices(), cmsApi.getZones()]);
        setRules(r.data); setServices(s.data); setZones(z.data);
    }, []);
    useEffect(() => { load(); }, [load]);

    const handleSave = async () => {
        try {
            if (editing.id) await cmsApi.updatePricingRule(editing.id, editing);
            else await cmsApi.createPricingRule(editing);
            addToast('success', 'Saved'); setShowForm(false); setEditing(null); load();
        } catch { addToast('error', 'Failed'); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete?')) return;
        try { await cmsApi.deletePricingRule(id); addToast('success', 'Deleted'); load(); } catch { addToast('error', 'Failed'); }
    };

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Pricing Control</h1>
                <button onClick={() => { setEditing({ serviceId: services[0]?.id || '', zoneId: '', timeStart: '', timeEnd: '', surgeMultiplier: 1.5, active: true }); setShowForm(true); }} style={btn}><Plus size={16} /> Add Rule</button>
            </div>
            <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: '#F8F9FB', borderBottom: '1px solid #E1E5EB' }}>
                        <th style={th}>Service</th><th style={th}>Zone</th><th style={th}>Time Window</th><th style={th}>Multiplier</th><th style={th}>Active</th><th style={th}>Actions</th>
                    </tr></thead>
                    <tbody>{rules.map(r => (
                        <tr key={r.id} style={{ borderBottom: '1px solid #F0F1F3' }}>
                            <td style={td}>{r.service?.name || '—'}</td>
                            <td style={td}>{r.zone?.name || 'All Zones'}</td>
                            <td style={td}>{r.timeStart && r.timeEnd ? `${r.timeStart} – ${r.timeEnd}` : 'All day'}</td>
                            <td style={td}><span style={{ fontWeight: 700, color: r.surgeMultiplier > 1 ? '#E74C3C' : 'green' }}>{r.surgeMultiplier}x</span></td>
                            <td style={td}><span style={{ color: r.active ? 'green' : 'red' }}>{r.active ? 'Yes' : 'No'}</span></td>
                            <td style={td}>
                                <button onClick={() => { setEditing({ ...r }); setShowForm(true); }} style={iconBtn}><Pencil size={14} /></button>
                                <button onClick={() => handleDelete(r.id)} style={{ ...iconBtn, color: '#E74C3C' }}><Trash2 size={14} /></button>
                            </td>
                        </tr>
                    ))}</tbody>
                </table>
                {rules.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>No pricing rules yet. Add one to create surge pricing.</div>}
            </div>
            {showForm && editing && (
                <div style={overlay}><div style={modal}>
                    <h2 style={{ marginBottom: 20 }}>{editing.id ? 'Edit' : 'Add'} Pricing Rule</h2>
                    <div style={{ display: 'grid', gap: 12 }}>
                        <label>Service <select value={editing.serviceId} onChange={e => setEditing({ ...editing, serviceId: e.target.value })} style={input}>{services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
                        <label>Zone (optional) <select value={editing.zoneId || ''} onChange={e => setEditing({ ...editing, zoneId: e.target.value || null })} style={input}><option value="">All Zones</option>{zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}</select></label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <label>Start Time <input type="time" value={editing.timeStart || ''} onChange={e => setEditing({ ...editing, timeStart: e.target.value })} style={input} /></label>
                            <label>End Time <input type="time" value={editing.timeEnd || ''} onChange={e => setEditing({ ...editing, timeEnd: e.target.value })} style={input} /></label>
                        </div>
                        <label>Surge Multiplier <input type="number" step="0.1" min="1" value={editing.surgeMultiplier} onChange={e => setEditing({ ...editing, surgeMultiplier: +e.target.value })} style={input} /></label>
                        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={editing.active} onChange={e => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
                    </div>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                        <button onClick={() => { setShowForm(false); setEditing(null); }} style={cancelBtn}>Cancel</button>
                        <button onClick={handleSave} style={saveBtn}>Save</button>
                    </div>
                </div></div>
            )}
        </div>
    );
}

const btn: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 };
const th: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6B7280' };
const td: React.CSSProperties = { padding: '12px 16px', fontSize: 14 };
const iconBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#6B7280' };
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 };
const modal: React.CSSProperties = { background: 'white', borderRadius: 16, padding: 32, width: 520, maxHeight: '90vh', overflowY: 'auto' };
const input: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #E1E5EB', borderRadius: 8, fontSize: 14, marginTop: 4, display: 'block' };
const cancelBtn: React.CSSProperties = { padding: '10px 20px', border: '1px solid #E1E5EB', borderRadius: 8, cursor: 'pointer', background: 'white' };
const saveBtn: React.CSSProperties = { padding: '10px 20px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 };
