import React, { useEffect, useState } from 'react';
import { adminApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Save, Settings, DollarSign, Zap, Power } from 'lucide-react';

export default function MasterControl() {
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await adminApi.getSystemConfig();
            setConfig(res.data);
        } catch (err) {
            addToast('error', 'Failed to load configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await adminApi.updateSystemConfig(config);
            addToast('success', 'Configuration updated successfully');
        } catch (err) {
            addToast('error', 'Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    const toggleService = (service: string) => {
        setConfig((prev: any) => ({
            ...prev,
            serviceAvailability: {
                ...prev.serviceAvailability,
                [service]: !prev.serviceAvailability[service]
            }
        }));
    };

    const updatePricing = (key: string, val: string) => {
        const numVal = parseInt(val) || 0;
        setConfig((prev: any) => ({
            ...prev,
            pricing: {
                ...prev.pricing,
                [key]: numVal
            }
        }));
    };

    const toggleFeature = (key: string) => {
        setConfig((prev: any) => ({
            ...prev,
            features: {
                ...prev.features,
                [key]: !prev.features[key]
            }
        }));
    };

    if (loading) return <div className="loading-page"><div className="spinner" /></div>;
    if (!config) return <div className="error-state">No config found</div>;

    return (
        <div className="animate-in">
            <div className="page-header" style={{ marginBottom: 'var(--space-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">Master Control</h1>
                    <p className="page-subtitle">Dynamic platform variables and toggles</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                >
                    {saving ? <div className="spinner-sm" /> : <Save size={18} />}
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-lg)' }}>
                {/* Pricing Controls */}
                <section className="card">
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <DollarSign size={20} color="var(--success)" /> Pricing Variables
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        <div className="form-group">
                            <label>Base Visit Fee (₹)</label>
                            <input
                                type="number"
                                className="input-field"
                                value={config.pricing.visitFee}
                                onChange={(e) => updatePricing('visitFee', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Lab Collection Fee (₹)</label>
                            <input
                                type="number"
                                className="input-field"
                                value={config.pricing.collectionFee}
                                onChange={(e) => updatePricing('collectionFee', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Doctor Custom Req Fee (₹)</label>
                            <input
                                type="number"
                                className="input-field"
                                value={config.pricing.consultationFee}
                                onChange={(e) => updatePricing('consultationFee', e.target.value)}
                            />
                        </div>
                    </div>
                </section>

                {/* Feature Toggles */}
                <section className="card">
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Zap size={20} color="var(--primary)" /> Feature Flags
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                            <div>
                                <div style={{ fontWeight: 600 }}>Auto-Closure Logic</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Automatically forward routine cases to completion</div>
                            </div>
                            <button
                                className={`btn ${config.features.autoClosureEnabled ? 'btn-success' : 'btn-secondary'}`}
                                onClick={() => toggleFeature('autoClosureEnabled')}
                                style={{ minWidth: 80 }}
                            >
                                {config.features.autoClosureEnabled ? 'ON' : 'OFF'}
                            </button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                            <div>
                                <div style={{ fontWeight: 600 }}>Video Consultation</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Enable video call placeholders for doctors</div>
                            </div>
                            <button
                                className={`btn ${config.features.videoConsultation ? 'btn-success' : 'btn-secondary'}`}
                                onClick={() => toggleFeature('videoConsultation')}
                                style={{ minWidth: 80 }}
                            >
                                {config.features.videoConsultation ? 'ON' : 'OFF'}
                            </button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                            <div>
                                <div style={{ fontWeight: 600 }}>SOS Spatial Tracking</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Real-time distance calculation for immediate care</div>
                            </div>
                            <button
                                className={`btn ${config.features.sosSpatialTracking ? 'btn-success' : 'btn-secondary'}`}
                                onClick={() => toggleFeature('sosSpatialTracking')}
                                style={{ minWidth: 80 }}
                            >
                                {config.features.sosSpatialTracking ? 'ON' : 'OFF'}
                            </button>
                        </div>
                    </div>
                </section>

                {/* Service Availability */}
                <section className="card" style={{ gridColumn: '1 / -1' }}>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Power size={20} color="var(--critical)" /> Service Availability
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
                        {Object.entries(config.serviceAvailability).map(([service, enabled]) => (
                            <div key={service}
                                className="card"
                                style={{
                                    padding: '12px',
                                    background: enabled ? 'var(--success-bg)' : 'var(--bg-secondary)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    border: enabled ? '1px solid var(--success)' : '1px solid var(--border)'
                                }}
                            >
                                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{service}</span>
                                <input
                                    type="checkbox"
                                    checked={enabled as boolean}
                                    onChange={() => toggleService(service)}
                                    style={{ width: 18, height: 18, accentColor: 'var(--success)' }}
                                />
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
