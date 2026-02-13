import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { io } from 'socket.io-client';
import { useToast } from '../context/ToastContext';
import {
    Activity,
    Calendar,
    CheckCircle2,
    Clock,
    FileText,
    MapPin,
    Microscope,
    Search,
    Upload,
    User,
    TestTube,
    AlertCircle
} from 'lucide-react';

interface LabOrder {
    id: string;
    serviceId: string;
    patientId: string;
    doctorId: string;
    testsJson: any;
    urgency: string;
    status: string;
    collectionTime: string | null;
    createdAt: string;
    patient: {
        id: string;
        name: string;
        phone?: string;
    };
    doctor: {
        id: string;
        name: string;
    };
    labReport?: {
        id: string;
        reportUrl: string;
    };
}

const LabDashboard: React.FC = () => {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [orders, setOrders] = useState<LabOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
    const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
    const [reportUrl, setReportUrl] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchOrders();

        const socket = io('http://localhost:3001');
        socket.on('connect', () => {
            socket.emit('join_room', 'role:admin'); // Lab listens to admin channel for now, or we implement role:lab
            // Ideally backend should have role:lab room
        });

        socket.on('lab_order_created', () => fetchOrders());
        socket.on('status_update', () => fetchOrders());
        socket.on('report_uploaded', () => fetchOrders());

        return () => {
            socket.disconnect();
        };
    }, []);

    const fetchOrders = async () => {
        try {
            // For now, fetching all orders using a new endpoint we might need to add, 
            // or just use the existing one if permissions allow.
            // Actually, we should create a getLabQueue endpoint.
            // Re-using getPatientLabOrders won't work.
            // Let's assume we add an endpoint or use a filtered generic one.
            // For MVP, if backend doesn't have it, we might need to add it.
            // Checking labController... it has getNurseLabTasks, getDoctorLabReviews. 
            // It lacks getLabQueue. I will add it to backend in next step.
            // For now UI code:
            const response = await api.get('/lab/queue');
            setOrders(response.data);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
            // addToast('error', 'Failed to load lab queue');
        } finally {
            setLoading(false);
        }
    };

    const handleUploadReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrder) return;
        if (!file && !reportUrl) {
            addToast('error', 'Please select a file or enter a URL');
            return;
        }

        setUploading(true);
        try {
            let finalReportUrl = reportUrl;

            if (file) {
                const formData = new FormData();
                formData.append('file', file);
                const uploadRes = await api.post('/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                finalReportUrl = uploadRes.data.url;
            }

            await api.post(`/lab/order/${selectedOrder.id}/report`, { reportUrl: finalReportUrl });
            addToast('success', 'Report uploaded successfully');
            setReportUrl('');
            setFile(null);
            setSelectedOrder(null);
            fetchOrders();
        } catch (error) {
            console.error('Upload failed:', error);
            addToast('error', 'Failed to upload report');
        } finally {
            setUploading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending_sample_collection': return 'text-orange-500 bg-orange-50 border-orange-200';
            case 'sample_collected': return 'text-blue-500 bg-blue-50 border-blue-200';
            case 'report_ready': return 'text-green-500 bg-green-50 border-green-200';
            case 'lab_closed': return 'text-gray-500 bg-gray-50 border-gray-200';
            default: return 'text-gray-500 bg-gray-50 border-gray-200';
        }
    };

    const filteredOrders = orders.filter(order => {
        if (filter === 'all') return true;
        if (filter === 'pending') return ['pending_sample_collection', 'sample_collected'].includes(order.status);
        if (filter === 'completed') return ['report_ready', 'lab_closed'].includes(order.status);
        return true;
    });

    if (loading) return <div className="p-8">Loading lab dashboard...</div>;

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Lab Dashboard</h1>
                    <p className="text-gray-500">Manage samples and reports</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-teal-600 text-white shadow-lg shadow-teal-200' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                        All Orders
                    </button>
                    <button
                        onClick={() => setFilter('pending')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'pending' ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                        Pending Actions
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredOrders.map(order => (
                    <div key={order.id} className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                                {order.status.replace(/_/g, ' ').toUpperCase()}
                            </div>
                            {order.urgency === 'high' && (
                                <div className="flex items-center text-red-500 text-xs font-bold">
                                    <AlertCircle size={14} className="mr-1" />
                                    URGENT
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                    <User size={20} />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-800">{order.patient.name}</p>
                                    <p className="text-xs text-gray-500">Ref: {order.doctor.name}</p>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-2">
                                <div className="flex items-center text-gray-600">
                                    <Microscope size={14} className="mr-2" />
                                    <span className="font-medium">Tests:</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {Array.isArray(order.testsJson) && order.testsJson.map((test: any, i: number) => (
                                        <span key={i} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-600">
                                            {test.name || test}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                                <div className="text-xs text-gray-400">
                                    {new Date(order.createdAt).toLocaleDateString()}
                                </div>

                                {order.status === 'sample_collected' && (
                                    <button
                                        onClick={() => setSelectedOrder(order)}
                                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center shadow-lg shadow-indigo-200"
                                    >
                                        <Upload size={16} className="mr-2" />
                                        Upload Report
                                    </button>
                                )}

                                {order.status === 'report_ready' && (
                                    <a
                                        href={order.labReport?.reportUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-teal-600 text-sm font-medium flex items-center hover:underline"
                                    >
                                        <FileText size={16} className="mr-1" />
                                        View Report
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {filteredOrders.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-400">
                        <Microscope size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No lab orders found for the selected filter.</p>
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Upload Lab Report</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Upload report for <span className="font-medium text-gray-800">{selectedOrder.patient.name}</span>
                        </p>

                        <form onSubmit={handleUploadReport} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Upload PDF Report</label>
                                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                                    />
                                    <div className="flex flex-col items-center justify-center text-gray-400">
                                        <Upload size={24} className="mb-2" />
                                        <p className="text-sm">{file ? file.name : 'Click to select PDF or drag and drop'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="text-center text-gray-400 text-xs my-2">- OR -</div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Report URL</label>
                                <input
                                    type="url"
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 transition-all outline-none"
                                    placeholder="https://"
                                    value={reportUrl}
                                    onChange={e => setReportUrl(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setSelectedOrder(null)}
                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors font-medium shadown-lg shadow-teal-200 disabled:opacity-50"
                                >
                                    {uploading ? 'Uploading...' : 'Submit Report'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LabDashboard;
