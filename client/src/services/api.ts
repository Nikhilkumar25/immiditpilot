import axios from 'axios';
import { apiCache } from './cache';

const BACKEND_URL = import.meta.env.VITE_PUBLIC_BACKEND_URL;
const API_BASE = BACKEND_URL + '/api';

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

// ============ REFRESH TOKEN INTERCEPTOR ============
let isRefreshing = false;
let failedQueue: { resolve: Function; reject: Function }[] = [];

function processQueue(error: any, token: string | null) {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) reject(error);
        else resolve(token);
    });
    failedQueue = [];
}

api.interceptors.response.use(
    (res) => res,
    async (error) => {
        const originalRequest = error.config;

        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            originalRequest.url !== '/auth/login' &&
            originalRequest.url !== '/auth/refresh'
        ) {
            const refreshToken = localStorage.getItem('immidit_refresh_token');

            if (!refreshToken) {
                clearAuthAndRedirect();
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const { data } = await api.post('/auth/refresh', { refreshToken });
                const newToken = data.token;

                localStorage.setItem('immidit_token', newToken);

                // Update the default header for future requests
                api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
                originalRequest.headers.Authorization = `Bearer ${newToken}`;

                processQueue(null, newToken);

                // Dispatch event so AuthContext & SocketContext can pick up the new token
                window.dispatchEvent(new CustomEvent('token_refreshed', { detail: { token: newToken } }));

                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                clearAuthAndRedirect();
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

function clearAuthAndRedirect() {
    localStorage.removeItem('immidit_token');
    localStorage.removeItem('immidit_refresh_token');
    localStorage.removeItem('immidit_user');
    if (window.location.pathname !== '/login') {
        window.location.href = '/login';
    }
}

// ============ AUTH ============
export const authApi = {
    login: (data: { phone: string; password: string }) =>
        api.post('/auth/login', data),
    sendOtp: (data: { phone: string; captchaToken?: string }) =>
        api.post('/auth/send-otp', data),
    verifyOtp: (data: { phone: string; otp: string }) =>
        api.post('/auth/verify-otp', data),
    register: (data: { phone: string; name: string; password: string; verificationToken: string }) =>
        api.post('/auth/register', data),
    forgotPassword: (data: { phone: string; captchaToken?: string }) =>
        api.post('/auth/forgot-password', data),
    resetPassword: (data: { phone: string; otp: string; password: string }) =>
        api.post('/auth/reset-password', data),
    getMe: () => api.get('/auth/me'),
};

// ============ CACHE WRAPPER ============
const cachedGet = async (key: string, request: () => Promise<any>) => {
    const cacheKey = apiCache.generateKey(key);
    const cached = apiCache.get(cacheKey);

    if (cached !== null) {
        return { data: cached, fromCache: true };
    }

    return request();
};

// ============ PROFILE ============
export const profileApi = {
    get: () => cachedGet('/profile', () => api.get('/profile')),
    update: (data: {
        name?: string; dateOfBirth?: string; gender?: string;
        bloodGroup?: string; emergencyContact?: string;
        medicalRegNo?: string; medicalHistory?: string;
        allergicInfo?: string; degreeProofUrl?: string;
        registrationProofUrl?: string;
    }) => api.patch('/profile', data),
};

// ============ SERVICES ============
export const serviceApi = {
    create: (data: {
        serviceType: string; symptoms: string; location: string; scheduledTime: string;
        addressId?: string; isImmediate?: boolean; serviceCategory?: string; locationDetails?: any;
    }) => api.post('/services', data),
    getMy: () => cachedGet('/services/my', () => api.get('/services/my')),
    getAssigned: () => cachedGet('/services/assigned', () => api.get('/services/assigned')),
    getPendingReview: () => cachedGet('/services/pending-review', () => api.get('/services/pending-review')),
    getById: (id: string) => cachedGet(`/services/${id}`, () => api.get(`/services/${id}`)),
    updateStatus: (id: string, status: string) => api.patch(`/services/${id}/status`, { status }),
    getPrescription: (id: string) => api.get(`/services/${id}/prescription`),
    cancel: (id: string) => api.patch(`/services/${id}/cancel`),
    assignNurse: (id: string, nurseId: string) => api.patch(`/services/${id}/assign`, { nurseId }),
    getAll: () => cachedGet('/services/all', () => api.get('/services/all')),
    checkInstantCareAvailability: () => api.get('/services/instant-care/check'),
    getFlowConfig: (serviceType: string) => api.get(`/services/flow-config/${serviceType}`),
    getNurseStats: () => api.get('/services/stats/completed'),
};

// ============ CLINICAL ============
export const clinicalApi = {
    submit: (serviceId: string, data: any) => api.post(`/clinical/${serviceId}`, data),
    get: (serviceId: string) => cachedGet(`/clinical/${serviceId}`, () => api.get(`/clinical/${serviceId}`)),
};

// ============ DOCTOR ============
export const doctorApi = {
    submitAction: (serviceId: string, data: any) => api.post(`/doctor/${serviceId}/action`, data),
    getAction: (serviceId: string) => cachedGet(`/doctor/${serviceId}/action`, () => api.get(`/doctor/${serviceId}/action`)),
    approveProcedure: (serviceId: string, data: any) => api.post(`/doctor/${serviceId}/approve`, data),
    requestEdit: (serviceId: string, notes?: string) => api.post(`/doctor/${serviceId}/request-edit`, { notes }),
    createPrescription: (serviceId: string, data: any) => api.post(`/doctor/${serviceId}/prescription`, data),
    getPrescription: (serviceId: string) => api.get(`/doctor/${serviceId}/prescription`),
};

// ============ LAB ============
export const labApi = {
    getAvailableTests: () => cachedGet('/lab/tests', () => api.get('/lab/tests')),
    createOrder: (data: any) => api.post('/lab/order', data),
    confirmOrder: (id: string, confirmedTests?: string[]) => api.patch(`/lab/order/${id}/confirm`, { confirmedTests }),
    collectSample: (id: string, checklist: any, samplePhotos?: string[], barcodes?: any[]) =>
        api.patch(`/lab/order/${id}/collect`, { checklist, samplePhotos, barcodes }),
    uploadReport: (id: string, reportUrl: string) => api.post(`/lab/order/${id}/report`, { reportUrl }),
    reviewReport: (id: string, doctorReviewNotes: string) => api.patch(`/lab/order/${id}/review`, { doctorReviewNotes }),
    getPatientOrders: (patientId: string) => cachedGet(`/lab/orders/patient/${patientId}`, () => api.get(`/lab/orders/patient/${patientId}`)),
    getNurseTasks: () => cachedGet('/lab/orders/nurse', () => api.get('/lab/orders/nurse')),
    getDoctorReviews: () => cachedGet('/lab/orders/doctor', () => api.get('/lab/orders/doctor')),
    receiveSample: (id: string) => api.patch(`/lab/order/${id}/receive`),
};

// ============ FILE UPLOAD (GCS) ============
export const uploadApi = {
    /** Upload a file to GCS and get back { fileId, url } */
    uploadFile: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    /** Get a short-lived signed download URL for a file */
    getFileUrl: (fileId: string) => api.get<{ url: string; expiresIn: number }>(`/upload/file/${fileId}`),
    /** Delete a file from GCS */
    deleteFile: (fileId: string) => api.delete(`/upload/file/${fileId}`),
};

// ============ ADMIN ============
export const adminApi = {
    getKpis: () => cachedGet('/admin/kpis', () => api.get('/admin/kpis')),
    getUsers: (role?: string) => cachedGet(`/admin/users${role ? `?role=${role}` : ''}`, () => api.get('/admin/users', { params: role ? { role } : {} })),
    getServices: () => cachedGet('/admin/services', () => api.get('/admin/services')),
    getAuditLogs: () => cachedGet('/admin/audit-logs', () => api.get('/admin/audit-logs')),
    assignNurse: (serviceId: string, nurseId: string) => api.patch(`/admin/services/${serviceId}/assign-nurse`, { nurseId }),
    updateStatus: (serviceId: string, status: string) => api.patch(`/admin/services/${serviceId}/status`, { status }),
    uploadLabReport: (labOrderId: string, reportUrl: string) => api.post(`/admin/lab-orders/${labOrderId}/report`, { reportUrl }),
    getSystemConfig: () => api.get('/admin/config'),
    updateSystemConfig: (data: any) => api.patch('/admin/config', data),
    updateUserRole: (userId: string, role: string) => api.patch(`/admin/users/${userId}/role`, { role }),
};

// ============ ADDRESS ============
export const addressApi = {
    save: (data: any) => api.post('/addresses', data),
    getAll: () => cachedGet('/addresses', () => api.get('/addresses')),
    delete: (id: string) => api.delete(`/addresses/${id}`),
};

// ============ RATINGS ============
export const ratingApi = {
    submit: (data: { serviceId: string; toUserId: string; score: number; category: string; comment?: string }) =>
        api.post('/ratings', data),
    getForUser: (userId: string) => cachedGet(`/ratings/user/${userId}`, () => api.get(`/ratings/user/${userId}`)),
};

// ============ PRESCRIPTION ============
export const prescriptionApi = {
    generate: (serviceId: string, data: any) => api.post(`/services/${serviceId}/prescription/generate`, data),
    get: (serviceId: string) => api.get(`/services/${serviceId}/prescription`),
    getFollowUps: (patientId: string) => api.get(`/patients/${patientId}/follow-ups`),
};

// ============ CMS ============
export const cmsApi = {
    // Dashboard config (public)
    getDashboardConfig: () => api.get('/cms/dashboard-config'),
    // Services
    getServices: () => api.get('/cms/services'),
    createService: (data: any) => api.post('/cms/services', data),
    updateService: (id: string, data: any) => api.patch(`/cms/services/${id}`, data),
    deleteService: (id: string) => api.delete(`/cms/services/${id}`),
    // Pricing
    getPricingRules: () => api.get('/cms/pricing-rules'),
    createPricingRule: (data: any) => api.post('/cms/pricing-rules', data),
    updatePricingRule: (id: string, data: any) => api.patch(`/cms/pricing-rules/${id}`, data),
    deletePricingRule: (id: string) => api.delete(`/cms/pricing-rules/${id}`),
    // Zones
    getZones: () => api.get('/cms/zones'),
    createZone: (data: any) => api.post('/cms/zones', data),
    updateZone: (id: string, data: any) => api.patch(`/cms/zones/${id}`, data),
    deleteZone: (id: string) => api.delete(`/cms/zones/${id}`),
    // Lab Tests
    getLabTests: () => api.get('/cms/lab-tests'),
    createLabTest: (data: any) => api.post('/cms/lab-tests', data),
    updateLabTest: (id: string, data: any) => api.patch(`/cms/lab-tests/${id}`, data),
    deleteLabTest: (id: string) => api.delete(`/cms/lab-tests/${id}`),
    // Lab Bundles
    getLabBundles: () => api.get('/cms/lab-bundles'),
    createLabBundle: (data: any) => api.post('/cms/lab-bundles', data),
    updateLabBundle: (id: string, data: any) => api.patch(`/cms/lab-bundles/${id}`, data),
    deleteLabBundle: (id: string) => api.delete(`/cms/lab-bundles/${id}`),
    // Templates
    getTemplates: () => api.get('/cms/templates'),
    createTemplate: (data: any) => api.post('/cms/templates', data),
    updateTemplate: (id: string, data: any) => api.patch(`/cms/templates/${id}`, data),
    deleteTemplate: (id: string) => api.delete(`/cms/templates/${id}`),
    // Protocols
    getProtocols: () => api.get('/cms/protocols'),
    createProtocol: (data: any) => api.post('/cms/protocols', data),
    updateProtocol: (id: string, data: any) => api.patch(`/cms/protocols/${id}`, data),
    deleteProtocol: (id: string) => api.delete(`/cms/protocols/${id}`),
    // Use Cases
    getUseCases: () => api.get('/cms/use-cases'),
    getActiveUseCases: () => api.get('/cms/use-cases/active'),
    createUseCase: (data: any) => api.post('/cms/use-cases', data),
    updateUseCase: (id: string, data: any) => api.patch(`/cms/use-cases/${id}`, data),
    deleteUseCase: (id: string) => api.delete(`/cms/use-cases/${id}`),
    // Notifications
    getNotifications: () => api.get('/cms/notifications'),
    createNotification: (data: any) => api.post('/cms/notifications', data),
    updateNotification: (id: string, data: any) => api.patch(`/cms/notifications/${id}`, data),
    deleteNotification: (id: string) => api.delete(`/cms/notifications/${id}`),
};

// ============ INVENTORY ============
export const inventoryApi = {
    getItems: () => api.get('/inventory/items'),
    createItem: (data: any) => api.post('/inventory/items', data),
    updateItem: (id: string, data: any) => api.patch(`/inventory/items/${id}`, data),
    deleteItem: (id: string) => api.delete(`/inventory/items/${id}`),
    getMovements: (itemId?: string) => api.get('/inventory/movements', { params: itemId ? { itemId } : {} }),
    createMovement: (data: any) => api.post('/inventory/movements', data),
    getConsumables: (serviceId: string) => api.get(`/inventory/consumables/${serviceId}`),
    addConsumable: (serviceId: string, data: any) => api.post(`/inventory/consumables/${serviceId}`, data),
    getLowStock: () => api.get('/inventory/low-stock'),
};

// ============ EXPORTS ============
export { apiCache };
export const clearApiCache = () => apiCache.clear();
export const invalidateApiCache = (pattern: string | RegExp) => apiCache.invalidatePattern(pattern);

export default api;
