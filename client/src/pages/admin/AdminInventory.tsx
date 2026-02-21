import React, { useEffect, useState, useCallback } from 'react';
import { inventoryApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Plus, Pencil, Trash2, Search, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';

export default function AdminInventory() {
    const [items, setItems] = useState<any[]>([]);
    const [lowStock, setLowStock] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState<any>(null);
    const [showForm, setShowForm] = useState(false);
    const [movementForm, setMovementForm] = useState<any>(null);
    const { addToast } = useToast();

    const load = useCallback(async () => {
        const [i, l] = await Promise.all([inventoryApi.getItems(), inventoryApi.getLowStock()]);
        setItems(i.data); setLowStock(l.data);
    }, []);
    useEffect(() => { load(); }, [load]);

    const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || (i.sku || '').toLowerCase().includes(search.toLowerCase()));

    const handleSave = async () => {
        try {
            if (editing.id) await inventoryApi.updateItem(editing.id, editing);
            else await inventoryApi.createItem(editing);
            addToast('success', 'Item saved'); setShowForm(false); setEditing(null); load();
        } catch { addToast('error', 'Failed'); }
    };

    const handleMovement = async () => {
        try {
            await inventoryApi.createMovement(movementForm);
            addToast('success', 'Stock updated'); setMovementForm(null); load();
        } catch { addToast('error', 'Failed'); }
    };

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Inventory Management</h1>
                <button onClick={() => { setEditing({ name: '', sku: '', unit: 'Pcs', currentStock: 0, reorderLevel: 10, costPrice: 0, salePrice: 0, active: true }); setShowForm(true); }} style={btn}><Plus size={16} /> Add Item</button>
            </div>

            {lowStock.length > 0 && (
                <div style={{ background: '#FEF3CD', border: '1px solid #F0C36D', borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <AlertTriangle size={20} color="#856404" />
                    <div><strong style={{ color: '#856404' }}>{lowStock.length} items below reorder level</strong>: {lowStock.map(i => i.name).join(', ')}</div>
                </div>
            )}

            <div style={{ position: 'relative', marginBottom: 16, maxWidth: 400 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search inventory..." style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #E1E5EB', borderRadius: 8, fontSize: 14 }} />
            </div>

            <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: '#F8F9FB', borderBottom: '1px solid #E1E5EB' }}>
                        <th style={th}>Name</th><th style={th}>SKU</th><th style={th}>Stock</th><th style={th}>Reorder</th><th style={th}>Cost</th><th style={th}>Sale</th><th style={th}>Actions</th>
                    </tr></thead>
                    <tbody>{filtered.map(item => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #F0F1F3', background: item.currentStock <= item.reorderLevel ? '#FFF8E1' : undefined }}>
                            <td style={td}><strong>{item.name}</strong><div style={{ fontSize: 11, color: '#999' }}>{item.unit}</div></td>
                            <td style={td}><code style={{ background: '#F0F1F3', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>{item.sku || '—'}</code></td>
                            <td style={td}><span style={{ fontWeight: 700, color: item.currentStock <= item.reorderLevel ? '#E74C3C' : 'inherit' }}>{item.currentStock}</span></td>
                            <td style={td}>{item.reorderLevel}</td>
                            <td style={td}>₹{item.costPrice}</td>
                            <td style={td}>{item.salePrice > 0 ? `₹${item.salePrice}` : <span style={{ color: '#999' }}>Internal</span>}</td>
                            <td style={td}>
                                <button onClick={() => setMovementForm({ itemId: item.id, type: 'IN', quantity: 0, reason: '', _name: item.name })} style={{ ...iconBtn, color: 'green' }} title="Stock In"><ArrowUp size={14} /></button>
                                <button onClick={() => setMovementForm({ itemId: item.id, type: 'OUT', quantity: 0, reason: '', _name: item.name })} style={{ ...iconBtn, color: '#E74C3C' }} title="Stock Out"><ArrowDown size={14} /></button>
                                <button onClick={() => { setEditing({ ...item }); setShowForm(true); }} style={iconBtn}><Pencil size={14} /></button>
                            </td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>

            {/* Item Form Modal */}
            {showForm && editing && (
                <div style={overlay}><div style={modal}>
                    <h2 style={{ marginBottom: 20 }}>{editing.id ? 'Edit' : 'Add'} Item</h2>
                    <div style={{ display: 'grid', gap: 12 }}>
                        <label>Name <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} style={input} /></label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <label>SKU <input value={editing.sku || ''} onChange={e => setEditing({ ...editing, sku: e.target.value })} style={input} /></label>
                            <label>Unit <input value={editing.unit} onChange={e => setEditing({ ...editing, unit: e.target.value })} style={input} /></label>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <label>Cost Price ₹ <input type="number" value={editing.costPrice} onChange={e => setEditing({ ...editing, costPrice: +e.target.value })} style={input} /></label>
                            <label>Sale Price ₹ <input type="number" value={editing.salePrice} onChange={e => setEditing({ ...editing, salePrice: +e.target.value })} style={input} /></label>
                        </div>
                        <label>Reorder Level <input type="number" value={editing.reorderLevel} onChange={e => setEditing({ ...editing, reorderLevel: +e.target.value })} style={input} /></label>
                    </div>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                        <button onClick={() => { setShowForm(false); setEditing(null); }} style={cancelBtn}>Cancel</button>
                        <button onClick={handleSave} style={saveBtn}>Save</button>
                    </div>
                </div></div>
            )}

            {/* Stock Movement Modal */}
            {movementForm && (
                <div style={overlay}><div style={modal}>
                    <h2 style={{ marginBottom: 20 }}>Stock {movementForm.type === 'IN' ? 'In' : 'Out'}: {movementForm._name}</h2>
                    <div style={{ display: 'grid', gap: 12 }}>
                        <label>Quantity <input type="number" min={1} value={movementForm.quantity} onChange={e => setMovementForm({ ...movementForm, quantity: +e.target.value })} style={input} /></label>
                        <label>Reason <input value={movementForm.reason} onChange={e => setMovementForm({ ...movementForm, reason: e.target.value })} placeholder="e.g. Purchase, Expired, Used" style={input} /></label>
                    </div>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                        <button onClick={() => setMovementForm(null)} style={cancelBtn}>Cancel</button>
                        <button onClick={handleMovement} style={saveBtn}>Confirm</button>
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
const modal: React.CSSProperties = { background: 'white', borderRadius: 16, padding: 32, width: 480, maxHeight: '90vh', overflowY: 'auto' };
const input: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #E1E5EB', borderRadius: 8, fontSize: 14, marginTop: 4, display: 'block' };
const cancelBtn: React.CSSProperties = { padding: '10px 20px', border: '1px solid #E1E5EB', borderRadius: 8, cursor: 'pointer', background: 'white' };
const saveBtn: React.CSSProperties = { padding: '10px 20px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 };
