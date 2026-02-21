import React, { useEffect, useState, useCallback } from 'react';
import { cmsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';

export default function AdminZones() {
    const [zones, setZones] = useState<any[]>([]);
    const [editing, setEditing] = useState<any>(null);
    const [showForm, setShowForm] = useState(false);
    const { addToast } = useToast();

    const load = useCallback(async () => { const { data } = await cmsApi.getZones(); setZones(data); }, []);
    useEffect(() => { load(); }, [load]);

    const handleSave = async () => {
        try {
            if (editing.id) await cmsApi.updateZone(editing.id, editing);
            else await cmsApi.createZone(editing);
            addToast('success', 'Zone saved'); setShowForm(false); setEditing(null); load();
        } catch { addToast('error', 'Failed'); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this zone?')) return;
        try { await cmsApi.deleteZone(id); addToast('success', 'Deleted'); load(); } catch { addToast('error', 'Failed'); }
    };

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Zone Management</h1>
                <button onClick={() => { setEditing({ name: '', centerLat: 28.46, centerLng: 77.03, radiusKm: 10, demandLevel: 'normal', active: true }); setShowForm(true); }} style={btn}><Plus size={16} /> Add Zone</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {zones.map(z => (
                    <div key={z.id} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: `4px solid ${z.active ? 'var(--primary)' : '#ccc'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 600 }}>{z.name}</h3>
                            <div>
                                <button onClick={() => { setEditing({ ...z }); setShowForm(true); }} style={iconBtn}><Pencil size={14} /></button>
                                <button onClick={() => handleDelete(z.id)} style={{ ...iconBtn, color: '#E74C3C' }}><Trash2 size={14} /></button>
                            </div>
                        </div>
                        <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.8 }}>
                            <div>📍 {z.centerLat.toFixed(4)}, {z.centerLng.toFixed(4)}</div>
                            <div>📏 Radius: {z.radiusKm} km</div>
                            <div>📊 Demand: <span style={{ fontWeight: 600, color: z.demandLevel === 'high' ? '#E74C3C' : z.demandLevel === 'normal' ? 'var(--primary)' : '#999' }}>{z.demandLevel}</span></div>
                            <div>Status: <span style={{ color: z.active ? 'green' : 'red', fontWeight: 600 }}>{z.active ? 'Active' : 'Inactive'}</span></div>
                        </div>
                    </div>
                ))}
            </div>
            {showForm && editing && (
                <div style={overlay}>
                    <div style={modal}>
                        <h2 style={{ marginBottom: 20 }}>{editing.id ? 'Edit' : 'Add'} Zone</h2>
                        <div style={{ display: 'grid', gap: 12 }}>
                            <label>Name <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} style={input} /></label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <label>Latitude <input type="number" step="0.0001" value={editing.centerLat} onChange={e => setEditing({ ...editing, centerLat: +e.target.value })} style={input} /></label>
                                <label>Longitude <input type="number" step="0.0001" value={editing.centerLng} onChange={e => setEditing({ ...editing, centerLng: +e.target.value })} style={input} /></label>
                            </div>
                            <label>Radius (km) <input type="number" value={editing.radiusKm} onChange={e => setEditing({ ...editing, radiusKm: +e.target.value })} style={input} /></label>
                            <label>Demand Level <select value={editing.demandLevel} onChange={e => setEditing({ ...editing, demandLevel: e.target.value })} style={input}><option>low</option><option>normal</option><option>high</option></select></label>
                            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={editing.active} onChange={e => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
                        </div>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                            <button onClick={() => { setShowForm(false); setEditing(null); }} style={cancelBtn}>Cancel</button>
                            <button onClick={handleSave} style={saveBtn}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const btn: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 };
const iconBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#6B7280' };
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 };
const modal: React.CSSProperties = { background: 'white', borderRadius: 16, padding: 32, width: 480, maxHeight: '90vh', overflowY: 'auto' };
const input: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #E1E5EB', borderRadius: 8, fontSize: 14, marginTop: 4, display: 'block' };
const cancelBtn: React.CSSProperties = { padding: '10px 20px', border: '1px solid #E1E5EB', borderRadius: 8, cursor: 'pointer', background: 'white' };
const saveBtn: React.CSSProperties = { padding: '10px 20px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 };
