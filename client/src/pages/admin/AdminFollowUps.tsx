import React, { useEffect, useState, useCallback } from 'react';
import { cmsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export default function AdminFollowUps() {
    const [protocols, setProtocols] = useState<any[]>([]);
    const [editing, setEditing] = useState<any>(null);
    const [showForm, setShowForm] = useState(false);
    const { addToast } = useToast();

    const load = useCallback(async () => { const { data } = await cmsApi.getProtocols(); setProtocols(data); }, []);
    useEffect(() => { load(); }, [load]);

    const handleSave = async () => {
        try {
            if (editing.id) await cmsApi.updateProtocol(editing.id, editing);
            else await cmsApi.createProtocol(editing);
            addToast('success', 'Saved'); setShowForm(false); setEditing(null); load();
        } catch { addToast('error', 'Failed'); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete?')) return;
        try { await cmsApi.deleteProtocol(id); addToast('success', 'Deleted'); load(); } catch { addToast('error', 'Failed'); }
    };

    const triggers = ['post_visit', 'lab_result_abnormal', 'post_vaccination', 'dengue_monitoring', 'elder_care', 'custom'];
    const types = ['nurse_visit', 'doctor_call', 'self_check', 'lab_retest'];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Follow-Up Protocols</h1>
                <button onClick={() => { setEditing({ triggerCondition: 'post_visit', followUpDays: 3, followUpType: 'nurse_visit', mandatory: false, active: true }); setShowForm(true); }} style={btn}><Plus size={16} /> Add Protocol</button>
            </div>
            <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: '#F8F9FB', borderBottom: '1px solid #E1E5EB' }}>
                        <th style={th}>Trigger</th><th style={th}>Days</th><th style={th}>Type</th><th style={th}>Mandatory</th><th style={th}>Active</th><th style={th}>Actions</th>
                    </tr></thead>
                    <tbody>{protocols.map(p => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #F0F1F3' }}>
                            <td style={td}><code style={{ background: '#F0F1F3', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{p.triggerCondition}</code></td>
                            <td style={td}><strong>{p.followUpDays}</strong> days</td>
                            <td style={td}>{p.followUpType.replace('_', ' ')}</td>
                            <td style={td}>{p.mandatory ? '⚠️ Yes' : 'No'}</td>
                            <td style={td}><span style={{ color: p.active ? 'green' : 'red' }}>{p.active ? 'Yes' : 'No'}</span></td>
                            <td style={td}>
                                <button onClick={() => { setEditing({ ...p }); setShowForm(true); }} style={iconBtn}><Pencil size={14} /></button>
                                <button onClick={() => handleDelete(p.id)} style={{ ...iconBtn, color: '#E74C3C' }}><Trash2 size={14} /></button>
                            </td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>
            {showForm && editing && (
                <div style={overlay}><div style={modal}>
                    <h2 style={{ marginBottom: 20 }}>{editing.id ? 'Edit' : 'Add'} Protocol</h2>
                    <div style={{ display: 'grid', gap: 12 }}>
                        <label>Trigger <select value={editing.triggerCondition} onChange={e => setEditing({ ...editing, triggerCondition: e.target.value })} style={input}>{triggers.map(t => <option key={t}>{t}</option>)}</select></label>
                        <label>Follow-Up Days <input type="number" value={editing.followUpDays} onChange={e => setEditing({ ...editing, followUpDays: +e.target.value })} style={input} /></label>
                        <label>Type <select value={editing.followUpType} onChange={e => setEditing({ ...editing, followUpType: e.target.value })} style={input}>{types.map(t => <option key={t}>{t}</option>)}</select></label>
                        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={editing.mandatory} onChange={e => setEditing({ ...editing, mandatory: e.target.checked })} /> Mandatory</label>
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
