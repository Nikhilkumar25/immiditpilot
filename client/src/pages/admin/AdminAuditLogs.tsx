import React, { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../../services/api';
import { Search, Filter } from 'lucide-react';

export default function AdminAuditLogs() {
    const [logs, setLogs] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const load = useCallback(async () => { const { data } = await adminApi.getAuditLogs(); setLogs(data); }, []);
    useEffect(() => { load(); }, [load]);

    const filtered = logs.filter(l =>
        l.actionType.toLowerCase().includes(search.toLowerCase()) ||
        l.entityType.toLowerCase().includes(search.toLowerCase()) ||
        l.user?.name?.toLowerCase().includes(search.toLowerCase())
    );

    const actionColors: Record<string, string> = { CREATE: '#27AE60', UPDATE: '#3498DB', DELETE: '#E74C3C' };

    return (
        <div style={{ padding: 24 }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 24 }}>Audit Logs</h1>
            <div style={{ position: 'relative', marginBottom: 16, maxWidth: 400 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search audit logs..." style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #E1E5EB', borderRadius: 8, fontSize: 14 }} />
            </div>
            <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: '#F8F9FB', borderBottom: '1px solid #E1E5EB' }}>
                        <th style={th}>Time</th><th style={th}>User</th><th style={th}>Action</th><th style={th}>Entity</th><th style={th}>Entity ID</th>
                    </tr></thead>
                    <tbody>{filtered.slice(0, 100).map(l => (
                        <tr key={l.id} style={{ borderBottom: '1px solid #F0F1F3' }}>
                            <td style={td}><span style={{ fontSize: 12 }}>{new Date(l.timestamp).toLocaleString()}</span></td>
                            <td style={td}>{l.user?.name || 'System'}</td>
                            <td style={td}><span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: `${actionColors[l.actionType] || '#999'}20`, color: actionColors[l.actionType] || '#999' }}>{l.actionType}</span></td>
                            <td style={td}><code style={{ background: '#F0F1F3', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>{l.entityType}</code></td>
                            <td style={td}><code style={{ fontSize: 10, color: '#999' }}>{l.entityId?.substring(0, 8)}...</code></td>
                        </tr>
                    ))}</tbody>
                </table>
                {filtered.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>No audit logs found</div>}
                {filtered.length > 100 && <div style={{ padding: 12, textAlign: 'center', color: '#999', fontSize: 13 }}>Showing first 100 of {filtered.length} results</div>}
            </div>
        </div>
    );
}

const th: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6B7280' };
const td: React.CSSProperties = { padding: '12px 16px', fontSize: 14 };
