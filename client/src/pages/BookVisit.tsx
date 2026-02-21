import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { serviceApi, addressApi, inventoryApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Calendar, MapPin, FileText, Stethoscope, ArrowLeft, Send, Zap, Plus, Trash2 } from 'lucide-react';
import AddressMap from '../components/AddressMap';
import { SERVICE_CATEGORIES } from '../../../shared/patientDashboardConfig';

const ALL_SERVICES = SERVICE_CATEGORIES.flatMap(cat => cat.services.map(s => s.label));

export default function BookVisit() {
    const location = useLocation();
    const preState = (location.state as any) || {};

    const [form, setForm] = useState<any>({
        serviceType: preState.preSelectedService || '',
        symptoms: preState.symptoms || '',
        location: '',
        scheduledTime: '',
        locationDetails: null as any,
        isImmediate: false,
        addressId: '' as string,
        hasProvidedMedication: true,
        selectedVaccineId: '',
    });
    const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
    const [showNewAddress, setShowNewAddress] = useState(false);
    const [newAddress, setNewAddress] = useState({
        label: 'Home',
        address: '',
        location: null as any,
        flatNumber: '',
        buildingName: '',
        floor: '',
        landmark: '',
        area: '',
        city: 'New Delhi',
        pincode: ''
    });
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [instantCare, setInstantCare] = useState({ available: false, message: 'Checking availability...' });
    const [vaccines, setVaccines] = useState<any[]>([]);

    const needsVaccineSelection = ['Tetanus (TT) Shot', 'Flu Shot', 'Hepatitis A', 'Hepatitis B (3 Doses)', 'HPV Vaccine', 'Rabies Vaccine', 'Rabies Vaccine (Dog Bite)', 'Injection', 'Insulin Injection Help'].includes(form.serviceType);

    React.useEffect(() => {
        fetchAddresses();
        checkInstantCare();
        fetchVaccines();
    }, []);

    const fetchVaccines = async () => {
        try {
            const res = await inventoryApi.getItems();
            // In a real app we might filter by category or tag. For now we use the whole list, or you can filter by name.
            setVaccines(res.data.filter((item: any) => item.category === 'Injectable'));
        } catch (err) {
            console.error('Failed to fetch inventory:', err);
        }
    };

    const checkInstantCare = async () => {
        try {
            const res = await serviceApi.checkInstantCareAvailability();
            setInstantCare(res.data);
        } catch (err) {
            console.error('Instant care check failed:', err);
            setInstantCare({ available: false, message: 'Availability check failed.' });
        }
    };

    const fetchAddresses = async () => {
        try {
            const res = await addressApi.getAll();
            setSavedAddresses(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const update = (key: string, value: any) => setForm({ ...form, [key]: value });

    const handleSaveAddress = async () => {
        if (!newAddress.address || !newAddress.label || !newAddress.flatNumber) {
            addToast('error', 'Address, Flat details and Label are required');
            return;
        }
        try {
            const res = await addressApi.save({
                ...newAddress,
                lat: newAddress.location?.lat,
                lng: newAddress.location?.lng
            });
            setSavedAddresses([res.data, ...savedAddresses]);
            setShowNewAddress(false);
            // Auto select
            update('location', res.data.address);
            update('locationDetails', res.data);
            update('addressId', res.data.id);
            setNewAddress({
                label: 'Home', address: '', location: null,
                flatNumber: '', buildingName: '', floor: '', landmark: '', area: '', city: 'New Delhi', pincode: ''
            });
            addToast('success', 'Address saved and selected!');
        } catch (err) {
            addToast('error', 'Failed to save address');
        }
    };

    const handleDeleteAddress = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await addressApi.delete(id);
            setSavedAddresses(savedAddresses.filter(a => a.id !== id));
        } catch (err) {
            addToast('error', 'Failed to delete address');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = { ...form };

            if (needsVaccineSelection && !form.hasProvidedMedication) {
                if (!form.selectedVaccineId) {
                    addToast('error', 'Please select the required vaccine/medicine.');
                    setLoading(false);
                    return;
                }
                const selectedVaccine = vaccines.find(v => v.id === form.selectedVaccineId);
                if (selectedVaccine) {
                    payload.requiredMedicationId = selectedVaccine.id;
                    payload.requiredMedicationName = selectedVaccine.name;
                    payload.medicationCost = selectedVaccine.salePrice;
                }
            }

            if (payload.isImmediate) {
                payload.scheduledTime = new Date().toISOString();
            } else if (!payload.scheduledTime) {
                addToast('error', 'Please select a scheduled time');
                setLoading(false);
                return;
            }
            await serviceApi.create(payload);
            addToast('success', 'Visit booked successfully!');
            navigate('/patient');
        } catch (err: any) {
            console.error('Book visit error:', err);
            addToast('error', err.response?.data?.error || 'Failed to book visit');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {/* Address Modal Overlay */}
            {showNewAddress && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 'var(--space-md)'
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Add New Address</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowNewAddress(false)}>&times;</button>
                        </div>
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                            <AddressMap onLocationSelect={(lat, lng, addr, parts) => {
                                setNewAddress(prev => ({
                                    ...prev,
                                    location: { lat, lng },
                                    address: addr,
                                    area: parts?.area || prev.area,
                                    city: parts?.city || prev.city,
                                    pincode: parts?.pincode || prev.pincode,
                                    landmark: parts?.landmark || prev.landmark,
                                    buildingName: parts?.building || prev.buildingName,
                                }));
                            }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                            <input
                                type="text" placeholder="Full Address (Auto-filled from map)"
                                className="form-input"
                                value={newAddress.address}
                                onChange={e => setNewAddress({ ...newAddress, address: e.target.value })}
                            />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                                <input
                                    type="text" placeholder="Flat / House No *" className="form-input"
                                    value={newAddress.flatNumber}
                                    onChange={e => setNewAddress({ ...newAddress, flatNumber: e.target.value })}
                                />
                                <input
                                    type="text" placeholder="Floor" className="form-input"
                                    value={newAddress.floor}
                                    onChange={e => setNewAddress({ ...newAddress, floor: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                                <input
                                    type="text" placeholder="Building / Society" className="form-input"
                                    value={newAddress.buildingName}
                                    onChange={e => setNewAddress({ ...newAddress, buildingName: e.target.value })}
                                />
                                <input
                                    type="text" placeholder="Landmark" className="form-input"
                                    value={newAddress.landmark}
                                    onChange={e => setNewAddress({ ...newAddress, landmark: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-sm)' }}>
                                <input
                                    type="text" placeholder="Area" className="form-input"
                                    value={newAddress.area}
                                    onChange={e => setNewAddress({ ...newAddress, area: e.target.value })}
                                />
                                <input
                                    type="text" placeholder="City" className="form-input"
                                    value={newAddress.city}
                                    onChange={e => setNewAddress({ ...newAddress, city: e.target.value })}
                                />
                                <input
                                    type="text" placeholder="Pincode" className="form-input"
                                    value={newAddress.pincode}
                                    onChange={e => setNewAddress({ ...newAddress, pincode: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {['Home', 'Work', 'Other'].map(l => (
                                    <button
                                        key={l} type="button"
                                        onClick={() => setNewAddress({ ...newAddress, label: l })}
                                        style={{
                                            padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem',
                                            fontWeight: 600, border: '1px solid',
                                            background: newAddress.label === l ? 'var(--text)' : 'var(--surface)',
                                            color: newAddress.label === l ? 'white' : 'var(--text-secondary)',
                                            borderColor: newAddress.label === l ? 'var(--text)' : 'var(--border)',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {l}
                                    </button>
                                ))}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 'var(--space-sm)', marginTop: 8, borderTop: '1px solid var(--border)' }}>
                                <button type="button" onClick={() => setShowNewAddress(false)} className="btn btn-ghost btn-sm">Cancel</button>
                                <button type="button" onClick={handleSaveAddress} className="btn btn-primary btn-sm">Save & Select</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="page-header" style={{ marginBottom: 'var(--space-md)' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/patient')} style={{ marginBottom: 4, padding: '4px 8px' }}>
                    <ArrowLeft size={14} /> Back
                </button>
                <h1 className="page-title" style={{ fontSize: '1.25rem', marginTop: 4 }}>Book Visit</h1>
            </div>

            <div className="card" style={{ maxWidth: 600 }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>

                    {/* Service Type */}
                    <div className="form-group">
                        <label className="form-label"><Stethoscope size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Service Type</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                            {ALL_SERVICES.map((type: string) => (
                                <button
                                    key={type} type="button" onClick={() => update('serviceType', type)}
                                    style={{
                                        padding: '12px 10px', borderRadius: 'var(--radius-md)', fontSize: '0.75rem',
                                        fontWeight: form.serviceType === type ? 700 : 400, textAlign: 'center',
                                        background: form.serviceType === type ? 'var(--primary-bg)' : 'var(--bg)',
                                        border: `1.5px solid ${form.serviceType === type ? 'var(--primary)' : 'var(--border)'}`,
                                        color: form.serviceType === type ? 'var(--primary)' : 'var(--text-secondary)',
                                        cursor: 'pointer', transition: 'var(--transition)',
                                        height: '100%', minHeight: '54px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Symptoms */}
                    <div className="form-group">
                        <label className="form-label"><FileText size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Symptoms</label>
                        <textarea
                            className="form-textarea" placeholder="Describe your symptoms in detail..."
                            value={form.symptoms} onChange={(e) => update('symptoms', e.target.value)} required
                            style={{ minHeight: 80 }}
                        />
                    </div>

                    {/* Vaccine / Injection Medication Selection */}
                    {needsVaccineSelection && (
                        <div className="form-group" style={{ background: 'var(--bg)', padding: 'var(--space-md)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                            <label className="form-label" style={{ marginBottom: 12 }}>Do you have the vaccine/medicine with you?</label>
                            <div style={{ display: 'flex', gap: 12, marginBottom: form.hasProvidedMedication ? 0 : 16 }}>
                                <button
                                    type="button"
                                    onClick={() => update('hasProvidedMedication', true)}
                                    style={{
                                        flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.875rem',
                                        border: `1.5px solid ${form.hasProvidedMedication ? 'var(--primary)' : 'var(--border)'}`,
                                        background: form.hasProvidedMedication ? 'var(--primary-bg)' : 'white',
                                        color: form.hasProvidedMedication ? 'var(--primary)' : 'var(--text)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Yes, I have it
                                </button>
                                <button
                                    type="button"
                                    onClick={() => update('hasProvidedMedication', false)}
                                    style={{
                                        flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.875rem',
                                        border: `1.5px solid ${!form.hasProvidedMedication ? 'var(--primary)' : 'var(--border)'}`,
                                        background: !form.hasProvidedMedication ? 'var(--primary-bg)' : 'white',
                                        color: !form.hasProvidedMedication ? 'var(--primary)' : 'var(--text)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    No, bring it for me
                                </button>
                            </div>

                            {!form.hasProvidedMedication && (
                                <div style={{ marginTop: 8 }}>
                                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Select Required Medicine</label>
                                    <select
                                        className="form-input bg-white cursor-pointer"
                                        value={form.selectedVaccineId}
                                        onChange={e => update('selectedVaccineId', e.target.value)}
                                        required
                                    >
                                        <option value="">-- Choose medicine to add --</option>
                                        {vaccines.map(v => (
                                            <option key={v.id} value={v.id}>{v.name} (+₹{v.salePrice})</option>
                                        ))}
                                    </select>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                                        The nurse will carry this medication. Cost will be added to your bill.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Address Selection */}
                    <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <label className="form-label" style={{ marginBottom: 0 }}><MapPin size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Location</label>
                            <button
                                type="button"
                                onClick={() => setShowNewAddress(true)}
                                style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                <Plus size={14} /> Add New
                            </button>
                        </div>

                        {/* Saved Addresses */}
                        {savedAddresses.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {savedAddresses.map(addr => (
                                    <div
                                        key={addr.id}
                                        onClick={() => {
                                            setForm((prev: any) => ({
                                                ...prev,
                                                location: addr.address,
                                                locationDetails: addr,
                                                addressId: addr.id,
                                            }));
                                        }}
                                        style={{
                                            padding: '12px', borderRadius: 'var(--radius-lg)',
                                            border: `1.5px solid ${form.addressId === addr.id ? 'var(--primary)' : 'var(--border)'}`,
                                            background: form.addressId === addr.id ? 'var(--primary-bg)' : 'var(--bg)',
                                            cursor: 'pointer', transition: 'var(--transition)',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            gap: 8
                                        }}
                                    >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.813rem' }}>{addr.label}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{addr.address}</div>
                                        </div>
                                        <button
                                            onClick={(e) => handleDeleteAddress(addr.id, e)}
                                            style={{ padding: 8, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowNewAddress(true)}
                                style={{ width: '100%', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1.5px dashed var(--border)', background: 'var(--bg)', color: 'var(--text-secondary)', fontSize: '0.875rem', cursor: 'pointer' }}
                            >
                                <Plus size={20} style={{ marginBottom: 4 }} /><br />Add a delivery address to proceed
                            </button>
                        )}
                    </div>

                    {/* Immediate or Schedule */}
                    <div style={{
                        background: form.isImmediate ? 'hsl(174, 62%, 96%)' : 'var(--bg)',
                        border: `1px solid ${form.isImmediate ? 'var(--primary)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-lg)', padding: 'var(--space-md)', transition: 'all 0.3s'
                    }}>
                        <div
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, cursor: instantCare.available ? 'pointer' : 'default' }}
                            onClick={() => instantCare.available && update('isImmediate', !form.isImmediate)}
                        >
                            <label style={{ fontSize: '0.875rem', fontWeight: 700, color: form.isImmediate ? 'var(--primary)' : 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', pointerEvents: 'none' }}>
                                <Zap size={16} style={form.isImmediate ? { fill: 'var(--primary)', color: 'var(--primary)' } : { color: 'var(--text-muted)' }} />
                                Immediate Service (Instant Care)
                            </label>
                            <div
                                style={{
                                    width: 44, height: 24, borderRadius: 12, padding: 3, transition: 'background 0.2s',
                                    background: form.isImmediate ? 'var(--primary)' : 'var(--border)',
                                    opacity: instantCare.available ? 1 : 0.5,
                                    cursor: instantCare.available ? 'pointer' : 'not-allowed'
                                }}
                            >
                                <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'transform 0.2s', transform: form.isImmediate ? 'translateX(20px)' : 'translateX(0)' }} />
                            </div>
                        </div>

                        {instantCare.available ? (
                            <div style={{ fontSize: '0.75rem', color: form.isImmediate ? 'var(--primary)' : 'var(--text-secondary)' }}>
                                <p style={{ fontWeight: 600 }}>⚡ {instantCare.message}</p>
                            </div>
                        ) : (
                            <div style={{ fontSize: '0.75rem', color: 'var(--critical)', fontWeight: 500 }}>
                                <p>⚠️ {instantCare.message}</p>
                            </div>
                        )}

                        {!form.isImmediate && (
                            <div style={{ marginTop: 'var(--space-md)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-md)' }}>
                                <label className="form-label" style={{ marginBottom: 4 }}><Calendar size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Scheduled Time Slot</label>
                                <select
                                    className="form-input bg-white cursor-pointer"
                                    value={form.scheduledTime}
                                    onChange={(e) => update('scheduledTime', e.target.value)}
                                    required={!form.isImmediate}
                                >
                                    <option value="">Select a time slot (20-min session)</option>
                                    {[0, 1].map(dayOffset => {
                                        const date = new Date();
                                        date.setDate(date.getDate() + dayOffset);
                                        const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                                        const slots = [];
                                        for (let hour = 8; hour < 20; hour++) {
                                            for (let min = 0; min < 60; min += 20) {
                                                const slotDate = new Date(date);
                                                slotDate.setHours(hour, min, 0, 0);
                                                if (slotDate > new Date()) slots.push(slotDate);
                                            }
                                        }
                                        return (
                                            <optgroup key={dayOffset} label={dayOffset === 0 ? 'Today' : dateStr}>
                                                {slots.map(slot => (
                                                    <option key={slot.toISOString()} value={slot.toISOString()}>
                                                        {slot.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {new Date(slot.getTime() + 20 * 60000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        );
                                    })}
                                </select>
                            </div>
                        )}
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading || !form.serviceType || (!form.isImmediate && !form.scheduledTime) || !form.location} style={{ marginTop: 'var(--space-md)' }}>
                        {loading ? <div className="spinner" /> : <><Send size={18} /> Book Visit</>}
                    </button>
                </form>
            </div>
        </div>
    );
}
