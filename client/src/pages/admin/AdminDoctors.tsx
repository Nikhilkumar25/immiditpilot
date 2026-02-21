import React, { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../../services/api';
import { Search, Phone, Mail, Shield } from 'lucide-react';

export default function AdminDoctors() {
    const [doctors, setDoctors] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const load = useCallback(async () => { const { data } = await adminApi.getUsers('doctor'); setDoctors(data); }, []);
    useEffect(() => { load(); }, [load]);
    const filtered = doctors.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || d.phone.includes(search));

    return (
        <div style={{ padding: 24 }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 24 }}>Doctor Management</h1>
            <div style={{ position: 'relative', marginBottom: 16, maxWidth: 400 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search doctors..." style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #E1E5EB', borderRadius: 8, fontSize: 14 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                {filtered.map(d => (
                    <div key={d.id} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#3498DB', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{d.name[0]}</div>
                            <div><div style={{ fontWeight: 600 }}>{d.name}</div><div style={{ fontSize: 12, color: '#6B7280' }}>{d.phone}</div></div>
                        </div>
                        <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.8 }}>
                            {d.email && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={12} /> {d.email}</div>}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={12} /> {d.phone}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Shield size={12} /> Joined: {new Date(d.createdAt).toLocaleDateString()}</div>
                        </div>
                    </div>
                ))}
            </div>
            {filtered.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>No doctors found</div>}
        </div>
    );
}
