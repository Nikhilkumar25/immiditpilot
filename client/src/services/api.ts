import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('immidit_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auto-logout on 401
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('immidit_token');
            localStorage.removeItem('immidit_user');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(err);
    }
);

// ============ AUTH ============
export const authApi = {
    register: (data: { email: string; password: string; name: string; phone: string; role: string }) =>
        api.post('/auth/register', data),
    login: (data: { email: string; password: string }) =>
        api.post('/auth/login', data),
    getMe: () => api.get('/auth/me'),
};

// ============ SERVICES ============
export const serviceApi = {
    create: (data: {
        serviceType: string; symptoms: string; location: string; scheduledTime: string;
        addressId?: string; isImmediate?: boolean; serviceCategory?: string; locationDetails?: any;
    }) => api.post('/services', data),
    getMy: () => api.get('/services/my'),
    getAssigned: () => api.get('/services/assigned'),
    getPendingReview: () => api.get('/services/pending-review'),
    getById: (id: string) => api.get(`/services/${id}`),
    updateStatus: (id: string, status: string) => api.patch(`/services/${id}/status`, { status }),
    cancel: (id: string) => api.patch(`/services/${id}/cancel`),
    assignNurse: (id: string, nurseId: string) => api.patch(`/services/${id}/assign`, { nurseId }),
    getAll: () => api.get('/services/all'),
    checkInstantCareAvailability: () => api.get('/services/instant-care/check'),
    getFlowConfig: (serviceType: string) => api.get(`/services/flow-config/${serviceType}`),
    getNurseStats: () => api.get('/services/stats/completed'),
};

// ============ CLINICAL ============
export const clinicalApi = {
    submit: (serviceId: string, data: any) => api.post(`/clinical/${serviceId}`, data),
    get: (serviceId: string) => api.get(`/clinical/${serviceId}`),
};

// ============ DOCTOR ============
export const doctorApi = {
    submitAction: (serviceId: string, data: any) => api.post(`/doctor/${serviceId}/action`, data),
    getAction: (serviceId: string) => api.get(`/doctor/${serviceId}/action`),
    approveProcedure: (serviceId: string, data: any) => api.post(`/doctor/${serviceId}/approve`, data),
    requestEdit: (serviceId: string, notes?: string) => api.post(`/doctor/${serviceId}/request-edit`, { notes }),
};

// ============ LAB ============
export const labApi = {
    createOrder: (data: any) => api.post('/lab/order', data),
    confirmOrder: (id: string) => api.patch(`/lab/order/${id}/confirm`),
    collectSample: (id: string, checklist: any) => api.patch(`/lab/order/${id}/collect`, { checklist }),
    uploadReport: (id: string, reportUrl: string) => api.post(`/lab/order/${id}/report`, { reportUrl }),
    reviewReport: (id: string, doctorReviewNotes: string) => api.patch(`/lab/order/${id}/review`, { doctorReviewNotes }),
    getPatientOrders: (patientId: string) => api.get(`/lab/orders/patient/${patientId}`),
    getNurseTasks: () => api.get('/lab/orders/nurse'),
    getDoctorReviews: () => api.get('/lab/orders/doctor'),
    receiveSample: (id: string) => api.patch(`/lab/order/${id}/receive`),
};

// ============ ADMIN ============
export const adminApi = {
    getKpis: () => api.get('/admin/kpis'),
    getUsers: (role?: string) => api.get('/admin/users', { params: role ? { role } : {} }),
    getServices: () => api.get('/admin/services'),
    getAuditLogs: () => api.get('/admin/audit-logs'),
    assignNurse: (serviceId: string, nurseId: string) => api.patch(`/admin/services/${serviceId}/assign-nurse`, { nurseId }),
    updateStatus: (serviceId: string, status: string) => api.patch(`/admin/services/${serviceId}/status`, { status }),
    uploadLabReport: (labOrderId: string, reportUrl: string) => api.post(`/admin/lab-orders/${labOrderId}/report`, { reportUrl }),
};

// ============ ADDRESS ============
export const addressApi = {
    save: (data: any) => api.post('/addresses', data),
    getAll: () => api.get('/addresses'),
    delete: (id: string) => api.delete(`/addresses/${id}`),
};

// ============ RATINGS ============
export const ratingApi = {
    submit: (data: { serviceId: string; toUserId: string; score: number; category: string; comment?: string }) =>
        api.post('/ratings', data),
    getForUser: (userId: string) => api.get(`/ratings/user/${userId}`),
};

// ============ PRESCRIPTION ============
export const prescriptionApi = {
    generate: (serviceId: string, data: any) => api.post(`/services/${serviceId}/prescription/generate`, data),
    get: (serviceId: string) => api.get(`/services/${serviceId}/prescription`),
    getFollowUps: (patientId: string) => api.get(`/patients/${patientId}/follow-ups`),
};

export default api;
