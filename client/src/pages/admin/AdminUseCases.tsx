import React, { useEffect, useState, useCallback } from 'react';
import { cmsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react';

export default function AdminUseCases() {
    const [useCases, setUseCases] = useState<any[]>([]);
    const [editing, setEditing] = useState<any>(null);
    const [showForm, setShowForm] = useState(false);
    const { addToast } = useToast();

    const load = useCallback(async () => { const { data } = await cmsApi.getUseCases(); setUseCases(data); }, []);
    useEffect(() => { load(); }, [load]);

    const handleSave = async () => {
        try {
            if (editing.id) await cmsApi.updateUseCase(editing.id, editing);
            else await cmsApi.createUseCase(editing);
            addToast('success', 'Saved'); setShowForm(false); setEditing(null); load();
        } catch { addToast('error', 'Failed'); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete?')) return;
        try { await cmsApi.deleteUseCase(id); addToast('success', 'Deleted'); load(); } catch { addToast('error', 'Failed'); }
    };

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Landing Page Use Cases</h1>
                <button onClick={() => { setEditing({ title: '', subtitle: '', description: '', themeColor: '#F25022', ctaText: 'Book Now', ctaAction: '/patient/book', illustrationUrl: '', order: useCases.length + 1, active: true }); setShowForm(true); }} style={btn}><Plus size={16} /> Add Use Case</button>
            </div>

            <div style={{ display: 'grid', gap: 16 }}>
                {useCases.map(uc => (
                    <div key={uc.id} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: `4px solid ${uc.themeColor}`, display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: uc.themeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, flexShrink: 0 }}>{uc.order}</div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{uc.title}</h3>
                            <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>{uc.subtitle}</p>
                        </div>
                        <span style={{ background: uc.themeColor, color: 'white', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{uc.ctaText}</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={() => { setEditing({ ...uc }); setShowForm(true); }} style={iconBtn}><Pencil size={14} /></button>
                            <button onClick={() => handleDelete(uc.id)} style={{ ...iconBtn, color: '#E74C3C' }}><Trash2 size={14} /></button>
                        </div>
                    </div>
                ))}
            </div>

            {showForm && editing && (
                <div style={overlay}><div style={modal}>
                    <h2 style={{ marginBottom: 20 }}>{editing.id ? 'Edit' : 'Add'} Use Case</h2>
                    <div style={{ display: 'grid', gap: 12 }}>
                        <label>Title <input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} style={input} /></label>
                        <label>Subtitle <input value={editing.subtitle || ''} onChange={e => setEditing({ ...editing, subtitle: e.target.value })} style={input} /></label>
                        <label>Description <textarea value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} rows={3} style={{ ...input, resize: 'vertical' }} /></label>
                        <label>Illustration URL <input value={editing.illustrationUrl || ''} onChange={e => setEditing({ ...editing, illustrationUrl: e.target.value })} style={input} placeholder="https://... or /assets/..." /></label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <label>Theme Color <input type="color" value={editing.themeColor} onChange={e => setEditing({ ...editing, themeColor: e.target.value })} style={{ ...input, height: 44 }} /></label>
                            <label>Order <input type="number" value={editing.order} onChange={e => setEditing({ ...editing, order: +e.target.value })} style={input} /></label>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <label>CTA Text <input value={editing.ctaText} onChange={e => setEditing({ ...editing, ctaText: e.target.value })} style={input} /></label>
                            <label>CTA Action <input value={editing.ctaAction} onChange={e => setEditing({ ...editing, ctaAction: e.target.value })} style={input} /></label>
                        </div>
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
const iconBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#6B7280' };
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 };
const modal: React.CSSProperties = { background: 'white', borderRadius: 16, padding: 32, width: 520, maxHeight: '90vh', overflowY: 'auto' };
const input: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #E1E5EB', borderRadius: 8, fontSize: 14, marginTop: 4, display: 'block' };
const cancelBtn: React.CSSProperties = { padding: '10px 20px', border: '1px solid #E1E5EB', borderRadius: 8, cursor: 'pointer', background: 'white' };
const saveBtn: React.CSSProperties = { padding: '10px 20px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 };
