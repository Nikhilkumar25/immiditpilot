import React, { useEffect, useState, useCallback } from 'react';
import { cmsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Plus, Pencil, Trash2, X, Check, Search } from 'lucide-react';

const CATEGORIES = ['Fever & Infection', 'Diabetes & BP', 'Thyroid & Hormone', 'Vaccinations', 'Elder & Home Support', 'Lab & Checkups'];

export default function AdminServices() {
    const [services, setServices] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState<any>(null);
    const [showForm, setShowForm] = useState(false);
    const { addToast } = useToast();

    const load = useCallback(async () => {
        const { data } = await cmsApi.getServices();
        setServices(data);
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = services.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.category.toLowerCase().includes(search.toLowerCase())
    );

    const handleSave = async () => {
        try {
            if (editing.id) {
                await cmsApi.updateService(editing.id, editing);
            } else {
                await cmsApi.createService(editing);
            }
            addToast('success', 'Service saved');
            setShowForm(false);
            setEditing(null);
            load();
        } catch { addToast('error', 'Failed to save'); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this service?')) return;
        try {
            await cmsApi.deleteService(id);
            addToast('success', 'Service deleted');
            load();
        } catch { addToast('error', 'Failed to delete'); }
    };

    const openNew = () => {
        setEditing({ name: '', category: CATEGORIES[0], basePrice: 499, instantCarePremium: 0, emergencyMultiplier: 1, followUpPrice: 149, estimatedDuration: 30, requiresDoctorReview: true, requiresVitals: true, requiresLabOption: false, active: true, order: services.length + 1 });
        setShowForm(true);
    };

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Service Management</h1>
                <button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                    <Plus size={16} /> Add Service
                </button>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 16, maxWidth: 400 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search services..." style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #E1E5EB', borderRadius: 8, fontSize: 14 }} />
            </div>

            {/* Table */}
            <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#F8F9FB', borderBottom: '1px solid #E1E5EB' }}>
                            <th style={th}>Name</th><th style={th}>Category</th><th style={th}>Base Price</th><th style={th}>Instant Premium</th><th style={th}>Duration</th><th style={th}>Doctor</th><th style={th}>Active</th><th style={th}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(s => (
                            <tr key={s.id} style={{ borderBottom: '1px solid #F0F1F3' }}>
                                <td style={td}><strong>{s.name}</strong></td>
                                <td style={td}><span style={{ background: '#F0F1F3', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{s.category}</span></td>
                                <td style={td}>₹{s.basePrice}</td>
                                <td style={td}>₹{s.instantCarePremium}</td>
                                <td style={td}>{s.estimatedDuration} min</td>
                                <td style={td}>{s.requiresDoctorReview ? <Check size={14} color="green" /> : <X size={14} color="#ccc" />}</td>
                                <td style={td}><span style={{ color: s.active ? 'green' : 'red', fontWeight: 600 }}>{s.active ? 'Yes' : 'No'}</span></td>
                                <td style={td}>
                                    <button onClick={() => { setEditing({ ...s }); setShowForm(true); }} style={iconBtn}><Pencil size={14} /></button>
                                    <button onClick={() => handleDelete(s.id)} style={{ ...iconBtn, color: '#E74C3C' }}><Trash2 size={14} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showForm && editing && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ background: 'white', borderRadius: 16, padding: 32, width: 560, maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 style={{ marginBottom: 20 }}>{editing.id ? 'Edit' : 'Add'} Service</h2>
                        <div style={{ display: 'grid', gap: 12 }}>
                            <label>Name <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} style={input} /></label>
                            <label>Category <select value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })} style={input}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <label>Base Price ₹ <input type="number" value={editing.basePrice} onChange={e => setEditing({ ...editing, basePrice: +e.target.value })} style={input} /></label>
                                <label>Instant Premium ₹ <input type="number" value={editing.instantCarePremium} onChange={e => setEditing({ ...editing, instantCarePremium: +e.target.value })} style={input} /></label>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <label>Duration (min) <input type="number" value={editing.estimatedDuration} onChange={e => setEditing({ ...editing, estimatedDuration: +e.target.value })} style={input} /></label>
                                <label>Follow-Up Price ₹ <input type="number" value={editing.followUpPrice} onChange={e => setEditing({ ...editing, followUpPrice: +e.target.value })} style={input} /></label>
                            </div>
                            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={editing.requiresDoctorReview} onChange={e => setEditing({ ...editing, requiresDoctorReview: e.target.checked })} /> Requires Doctor</label>
                                <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={editing.requiresVitals} onChange={e => setEditing({ ...editing, requiresVitals: e.target.checked })} /> Requires Vitals</label>
                                <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={editing.requiresLabOption} onChange={e => setEditing({ ...editing, requiresLabOption: e.target.checked })} /> Lab Option</label>
                                <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={editing.active} onChange={e => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                            <button onClick={() => { setShowForm(false); setEditing(null); }} style={{ padding: '10px 20px', border: '1px solid #E1E5EB', borderRadius: 8, cursor: 'pointer', background: 'white' }}>Cancel</button>
                            <button onClick={handleSave} style={{ padding: '10px 20px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const th: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6B7280' };
const td: React.CSSProperties = { padding: '12px 16px', fontSize: 14 };
const input: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #E1E5EB', borderRadius: 8, fontSize: 14, marginTop: 4, display: 'block' };
const iconBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#6B7280' };
