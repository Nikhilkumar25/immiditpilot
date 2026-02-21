import React, { useEffect, useState, useCallback } from 'react';
import { cmsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Plus, Pencil, Trash2, Search, Check, X } from 'lucide-react';

export default function AdminLabTests() {
    const [tests, setTests] = useState<any[]>([]);
    const [bundles, setBundles] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState<any>(null);
    const [showForm, setShowForm] = useState(false);
    const [tab, setTab] = useState<'tests' | 'bundles'>('tests');
    const { addToast } = useToast();

    const load = useCallback(async () => {
        const [t, b] = await Promise.all([cmsApi.getLabTests(), cmsApi.getLabBundles()]);
        setTests(t.data); setBundles(b.data);
    }, []);
    useEffect(() => { load(); }, [load]);

    const handleSaveTest = async () => {
        try {
            if (editing.id) await cmsApi.updateLabTest(editing.id, editing);
            else await cmsApi.createLabTest(editing);
            addToast('success', 'Saved'); setShowForm(false); setEditing(null); load();
        } catch { addToast('error', 'Failed'); }
    };

    const handleDeleteTest = async (id: string) => {
        if (!confirm('Delete this test?')) return;
        try { await cmsApi.deleteLabTest(id); addToast('success', 'Deleted'); load(); } catch { addToast('error', 'Failed'); }
    };

    const filtered = tests.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase()));

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Lab Management</h1>
                <button onClick={() => { setEditing({ name: '', category: 'Biochemistry', price: 0, preparationInstructions: '', reportTAT: '', active: true, order: tests.length + 1 }); setShowForm(true); }} style={btn}><Plus size={16} /> Add Test</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button onClick={() => setTab('tests')} style={{ ...tabBtn, ...(tab === 'tests' ? tabActive : {}) }}>Tests ({tests.length})</button>
                <button onClick={() => setTab('bundles')} style={{ ...tabBtn, ...(tab === 'bundles' ? tabActive : {}) }}>Bundles ({bundles.length})</button>
            </div>

            {tab === 'tests' && <>
                <div style={{ position: 'relative', marginBottom: 16, maxWidth: 400 }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tests..." style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #E1E5EB', borderRadius: 8, fontSize: 14 }} />
                </div>
                <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead><tr style={{ background: '#F8F9FB', borderBottom: '1px solid #E1E5EB' }}>
                            <th style={th}>Name</th><th style={th}>Category</th><th style={th}>Price</th><th style={th}>TAT</th><th style={th}>Prep</th><th style={th}>Active</th><th style={th}>Actions</th>
                        </tr></thead>
                        <tbody>{filtered.map(t => (
                            <tr key={t.id} style={{ borderBottom: '1px solid #F0F1F3' }}>
                                <td style={td}><strong>{t.name}</strong></td>
                                <td style={td}><span style={{ background: '#F0F1F3', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{t.category}</span></td>
                                <td style={td}>₹{t.price}</td>
                                <td style={td}>{t.reportTAT || '—'}</td>
                                <td style={td} title={t.preparationInstructions}>{t.preparationInstructions ? '✅' : '—'}</td>
                                <td style={td}><span style={{ color: t.active ? 'green' : 'red', fontWeight: 600 }}>{t.active ? 'Yes' : 'No'}</span></td>
                                <td style={td}>
                                    <button onClick={() => { setEditing({ ...t }); setShowForm(true); }} style={iconBtn}><Pencil size={14} /></button>
                                    <button onClick={() => handleDeleteTest(t.id)} style={{ ...iconBtn, color: '#E74C3C' }}><Trash2 size={14} /></button>
                                </td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
            </>}

            {tab === 'bundles' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                    {bundles.map(b => (
                        <div key={b.id} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <h3 style={{ fontSize: 16, fontWeight: 600 }}>{b.name}</h3>
                                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>₹{b.bundlePrice}</span>
                            </div>
                            <div style={{ fontSize: 13, color: '#6B7280' }}>
                                {b.tests?.map((bt: any) => <div key={bt.id}>• {bt.test.name} (₹{bt.test.price})</div>)}
                            </div>
                            <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
                                Individual total: ₹{b.tests?.reduce((s: number, bt: any) => s + bt.test.price, 0) || 0}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showForm && editing && (
                <div style={overlay}>
                    <div style={modal}>
                        <h2 style={{ marginBottom: 20 }}>{editing.id ? 'Edit' : 'Add'} Lab Test</h2>
                        <div style={{ display: 'grid', gap: 12 }}>
                            <label>Name <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} style={input} /></label>
                            <label>Category <select value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })} style={input}>
                                {['Hematology', 'Biochemistry', 'Immunology', 'Serology', 'Microbiology'].map(c => <option key={c}>{c}</option>)}
                            </select></label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <label>Price ₹ <input type="number" value={editing.price} onChange={e => setEditing({ ...editing, price: +e.target.value })} style={input} /></label>
                                <label>Report TAT <input value={editing.reportTAT || ''} onChange={e => setEditing({ ...editing, reportTAT: e.target.value })} placeholder="e.g. 4 hours" style={input} /></label>
                            </div>
                            <label>Preparation Instructions <textarea value={editing.preparationInstructions || ''} onChange={e => setEditing({ ...editing, preparationInstructions: e.target.value })} rows={3} style={{ ...input, resize: 'vertical' }} /></label>
                            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={editing.active} onChange={e => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
                        </div>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                            <button onClick={() => { setShowForm(false); setEditing(null); }} style={cancelBtn}>Cancel</button>
                            <button onClick={handleSaveTest} style={saveBtn}>Save</button>
                        </div>
                    </div>
                </div>
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
const tabBtn: React.CSSProperties = { padding: '8px 16px', border: '1px solid #E1E5EB', borderRadius: 8, cursor: 'pointer', background: 'white', fontSize: 14 };
const tabActive: React.CSSProperties = { background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' };
