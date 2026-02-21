import React, { useEffect, useState, useCallback } from 'react';
import { cmsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export default function AdminTemplates() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [editing, setEditing] = useState<any>(null);
    const [showForm, setShowForm] = useState(false);
    const { addToast } = useToast();

    const load = useCallback(async () => { const { data } = await cmsApi.getTemplates(); setTemplates(data); }, []);
    useEffect(() => { load(); }, [load]);

    const handleSave = async () => {
        try {
            if (editing.id) await cmsApi.updateTemplate(editing.id, editing);
            else await cmsApi.createTemplate(editing);
            addToast('success', 'Saved'); setShowForm(false); setEditing(null); load();
        } catch { addToast('error', 'Failed'); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete?')) return;
        try { await cmsApi.deleteTemplate(id); addToast('success', 'Deleted'); load(); } catch { addToast('error', 'Failed'); }
    };

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Prescription Templates</h1>
                <button onClick={() => { setEditing({ name: '', defaultDiagnosisText: '', defaultAdvice: '', defaultMedications: null, defaultFollowUpDays: 3, active: true }); setShowForm(true); }} style={btn}><Plus size={16} /> Add Template</button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
                {templates.map(t => (
                    <div key={t.id} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: '4px solid var(--primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 600 }}>{t.name}</h3>
                            <div>
                                <button onClick={() => { setEditing({ ...t }); setShowForm(true); }} style={iconBtn}><Pencil size={14} /></button>
                                <button onClick={() => handleDelete(t.id)} style={{ ...iconBtn, color: '#E74C3C' }}><Trash2 size={14} /></button>
                            </div>
                        </div>
                        <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.8 }}>
                            <div><strong>Diagnosis:</strong> {t.defaultDiagnosisText || '—'}</div>
                            <div><strong>Advice:</strong> {t.defaultAdvice || '—'}</div>
                            <div><strong>Follow-up:</strong> {t.defaultFollowUpDays ? `${t.defaultFollowUpDays} days` : 'None'}</div>
                        </div>
                    </div>
                ))}
            </div>
            {showForm && editing && (
                <div style={overlay}><div style={modal}>
                    <h2 style={{ marginBottom: 20 }}>{editing.id ? 'Edit' : 'Add'} Template</h2>
                    <div style={{ display: 'grid', gap: 12 }}>
                        <label>Name <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} style={input} /></label>
                        <label>Default Diagnosis <input value={editing.defaultDiagnosisText || ''} onChange={e => setEditing({ ...editing, defaultDiagnosisText: e.target.value })} style={input} /></label>
                        <label>Default Advice <textarea value={editing.defaultAdvice || ''} onChange={e => setEditing({ ...editing, defaultAdvice: e.target.value })} rows={3} style={{ ...input, resize: 'vertical' }} /></label>
                        <label>Follow-Up Days <input type="number" value={editing.defaultFollowUpDays || 0} onChange={e => setEditing({ ...editing, defaultFollowUpDays: +e.target.value })} style={input} /></label>
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
