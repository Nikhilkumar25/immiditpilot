import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { serviceApi, addressApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Calendar, MapPin, FileText, Stethoscope, ArrowLeft, Send, Zap, Plus, Trash2 } from 'lucide-react';
import AddressMap from '../components/AddressMap';

const SERVICE_TYPES = [
    'General Checkup', 'Vitals Monitoring', 'Wound Dressing', 'IV Therapy',
    'Injection', 'Post-Operative Care', 'Elderly Care', 'Pediatric Nursing',
    'Catheter Care', 'Emergency Assessment',
];

export default function BookVisit() {
    const [form, setForm] = useState({
        serviceType: '',
        symptoms: '',
        location: '',
        scheduledTime: '',
        locationDetails: null as any,
        isImmediate: false
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

    React.useEffect(() => {
        fetchAddresses();
    }, []);

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
            <div className="page-header">
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/patient')} style={{ marginBottom: 'var(--space-sm)' }}>
                    <ArrowLeft size={16} /> Back to Dashboard
                </button>
                <h1 className="page-title">Book a Medical Visit</h1>
                <p className="page-subtitle">Fill in the details to request a nurse visit.</p>
            </div>

            <div className="card" style={{ maxWidth: 600 }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

                    {/* Service Type */}
                    <div className="form-group">
                        <label className="form-label"><Stethoscope size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Service Type</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                            {SERVICE_TYPES.map((type) => (
                                <button
                                    key={type} type="button" onClick={() => update('serviceType', type)}
                                    style={{
                                        padding: '10px 12px', borderRadius: 'var(--radius-md)', fontSize: '0.813rem',
                                        fontWeight: form.serviceType === type ? 700 : 400, textAlign: 'left',
                                        background: form.serviceType === type ? 'var(--primary-bg)' : 'var(--bg)',
                                        border: `1.5px solid ${form.serviceType === type ? 'var(--primary)' : 'var(--border)'}`,
                                        color: form.serviceType === type ? 'var(--primary)' : 'var(--text-secondary)',
                                        cursor: 'pointer', transition: 'var(--transition)',
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
                        />
                    </div>

                    {/* Address Selection */}
                    <div className="form-group">
                        <label className="form-label"><MapPin size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Location</label>

                        {/* Saved Addresses */}
                        {savedAddresses.length > 0 && (
                            <div className="grid grid-cols-1 gap-2 mb-3">
                                {savedAddresses.map(addr => (
                                    <div
                                        key={addr.id}
                                        onClick={() => {
                                            update('location', addr.address);
                                            update('locationDetails', addr);
                                        }}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${form.location === addr.address ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-500' : 'border-gray-200 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div>
                                            <div className="font-medium text-sm text-gray-800">{addr.label}</div>
                                            <div className="text-xs text-gray-500 truncate">{addr.address}</div>
                                        </div>
                                        <button
                                            onClick={(e) => handleDeleteAddress(addr.id, e)}
                                            className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add New Address Toggle */}
                        {!showNewAddress ? (
                            <button
                                type="button"
                                onClick={() => setShowNewAddress(true)}
                                className="text-sm text-teal-600 font-medium flex items-center gap-1 hover:text-teal-700 w-fit"
                            >
                                <Plus size={16} /> Add New Address
                            </button>
                        ) : (
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 animation-expand">
                                <div className="mb-3">
                                    <AddressMap onLocationSelect={(lat, lng, addr) => {
                                        setNewAddress(prev => ({
                                            ...prev,
                                            location: { lat, lng },
                                            address: addr
                                        }));
                                    }} />
                                </div>
                                <div className="space-y-3">
                                    <input
                                        type="text" placeholder="Full Address (Auto-filled from map)"
                                        className="form-input text-sm bg-white"
                                        value={newAddress.address}
                                        onChange={e => setNewAddress({ ...newAddress, address: e.target.value })}
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            type="text" placeholder="Flat / House No *" className="form-input text-sm"
                                            value={newAddress.flatNumber}
                                            onChange={e => setNewAddress({ ...newAddress, flatNumber: e.target.value })}
                                        />
                                        <input
                                            type="text" placeholder="Floor" className="form-input text-sm"
                                            value={newAddress.floor}
                                            onChange={e => setNewAddress({ ...newAddress, floor: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            type="text" placeholder="Building / Society" className="form-input text-sm"
                                            value={newAddress.buildingName}
                                            onChange={e => setNewAddress({ ...newAddress, buildingName: e.target.value })}
                                        />
                                        <input
                                            type="text" placeholder="Landmark" className="form-input text-sm"
                                            value={newAddress.landmark}
                                            onChange={e => setNewAddress({ ...newAddress, landmark: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <input
                                            type="text" placeholder="Area" className="form-input text-sm"
                                            value={newAddress.area}
                                            onChange={e => setNewAddress({ ...newAddress, area: e.target.value })}
                                        />
                                        <input
                                            type="text" placeholder="City" className="form-input text-sm"
                                            value={newAddress.city}
                                            onChange={e => setNewAddress({ ...newAddress, city: e.target.value })}
                                        />
                                        <input
                                            type="text" placeholder="Pincode" className="form-input text-sm"
                                            value={newAddress.pincode}
                                            onChange={e => setNewAddress({ ...newAddress, pincode: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        {['Home', 'Work', 'Other'].map(l => (
                                            <button
                                                key={l} type="button"
                                                onClick={() => setNewAddress({ ...newAddress, label: l })}
                                                className={`px-3 py-1 rounded-full text-xs font-medium border ${newAddress.label === l ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'
                                                    }`}
                                            >
                                                {l}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowNewAddress(false)}
                                            className="text-gray-500 text-sm px-3 py-1.5 hover:bg-gray-200 rounded-lg"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSaveAddress}
                                            className="bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-black"
                                        >
                                            Save Address
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Selected Location Display if manually typed or selected outside save */}
                        {!showNewAddress && form.location && !savedAddresses.some(a => a.address === form.location) && (
                            <div className="mt-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                                📍 {form.location}
                            </div>
                        )}
                    </div>

                    {/* Immediate or Schedule */}
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                        <div
                            className="flex items-center justify-between mb-2 cursor-pointer"
                            onClick={() => update('isImmediate', !form.isImmediate)}
                        >
                            <label className="text-sm font-bold text-indigo-900 flex items-center gap-2 cursor-pointer pointer-events-none">
                                <Zap size={16} className={form.isImmediate ? 'fill-indigo-600 text-indigo-600' : 'text-indigo-400'} />
                                Immediate Service
                            </label>
                            <div
                                className={`w-12 h-6 rounded-full p-1 transition-colors ${form.isImmediate ? 'bg-indigo-600' : 'bg-gray-300'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${form.isImmediate ? 'translate-x-6' : 'translate-x-0'}`} />
                            </div>
                        </div>

                        {form.isImmediate ? (
                            <div className="text-sm text-indigo-700 animate-in fade-in slide-in-from-top-2">
                                <p className="font-medium mb-1">⚡ Arriving in ~30 mins</p>
                                <p className="text-xs opacity-80">A nurse nearby will be assigned immediately.</p>
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-top-2 mt-3">
                                <label className="form-label mb-1"><Calendar size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Scheduled Time</label>
                                <select
                                    className="form-input bg-white cursor-pointer"
                                    value={form.scheduledTime}
                                    onChange={(e) => update('scheduledTime', e.target.value)}
                                    required={!form.isImmediate}
                                >
                                    <option value="">Select a time slot</option>
                                    {/* Generate slots 8 AM to 8 PM for today and tomorrow */}
                                    {[0, 1].map(dayOffset => {
                                        const date = new Date();
                                        date.setDate(date.getDate() + dayOffset);
                                        const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

                                        const slots = [];
                                        for (let hour = 8; hour < 20; hour++) {
                                            for (let min = 0; min < 60; min += 20) {
                                                const slotDate = new Date(date);
                                                slotDate.setHours(hour, min, 0, 0);
                                                // Skip past slots
                                                if (slotDate > new Date()) {
                                                    slots.push(slotDate);
                                                }
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

                    <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading || !form.serviceType || (!form.isImmediate && !form.scheduledTime) || !form.location}>
                        {loading ? <div className="spinner" /> : <><Send size={18} /> Book Visit</>}
                    </button>
                </form>
            </div>
        </div>
    );
}
