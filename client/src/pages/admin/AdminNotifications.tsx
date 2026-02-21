import React, { useEffect, useState, useCallback } from 'react';
import { cmsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Pencil, Plus, Trash2 } from 'lucide-react';

export default function AdminNotifications() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [editing, setEditing] = useState<any>(null);
    const [showForm, setShowForm] = useState(false);
    const { addToast } = useToast();

    const load = useCallback(async () => { const { data } = await cmsApi.getNotifications(); setTemplates(data); }, []);
    useEffect(() => { load(); }, [load]);

    const handleSave = async () => {
        try {
            if (editing.id) await cmsApi.updateNotification(editing.id, editing);
            else await cmsApi.createNotification(editing);
            addToast('success', 'Saved'); setShowForm(false); setEditing(null); load();
        } catch { addToast('error', 'Failed'); }
    };

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Notification Templates</h1>
                <button onClick={() => { setEditing({ eventType: '', title: '', messageTemplate: '', deliveryChannel: 'push', active: true }); setShowForm(true); }} style={btn}><Plus size={16} /> Add Template</button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
                {templates.map(t => (
                    <div key={t.id} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div><code style={{ background: '#F0F1F3', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{t.eventType}</code> <span style={{ fontWeight: 600, marginLeft: 8 }}>{t.title}</span></div>
                            <div>
                                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: t.deliveryChannel === 'push' ? '#E3F2FD' : t.deliveryChannel === 'both' ? '#E8F5E9' : '#FFF3E0', marginRight: 8 }}>{t.deliveryChannel}</span>
                                <button onClick={() => { setEditing({ ...t }); setShowForm(true); }} style={iconBtn}><Pencil size={14} /></button>
                            </div>
                        </div>
                        <p style={{ fontSize: 13, color: '#6B7280', margin: 0, fontStyle: 'italic' }}>{t.messageTemplate}</p>
                    </div>
                ))}
            </div>
            {showForm && editing && (
                <div style={overlay}><div style={modal}>
                    <h2 style={{ marginBottom: 20 }}>{editing.id ? 'Edit' : 'Add'} Template</h2>
                    <div style={{ display: 'grid', gap: 12 }}>
                        <label>Event Type <input value={editing.eventType} onChange={e => setEditing({ ...editing, eventType: e.target.value })} placeholder="e.g. nurse_assigned" style={input} /></label>
                        <label>Title <input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} style={input} /></label>
                        <label>Message Template <textarea value={editing.messageTemplate} onChange={e => setEditing({ ...editing, messageTemplate: e.target.value })} rows={3} placeholder='Use {{variable}} for dynamic values' style={{ ...input, resize: 'vertical' }} /></label>
                        <label>Channel <select value={editing.deliveryChannel} onChange={e => setEditing({ ...editing, deliveryChannel: e.target.value })} style={input}><option>push</option><option>sms</option><option>both</option></select></label>
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
