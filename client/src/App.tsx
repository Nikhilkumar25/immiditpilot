import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PatientDashboard from './pages/PatientDashboard';
import NurseDashboard from './pages/NurseDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import MasterControl from './pages/MasterControl';
import BookVisit from './pages/BookVisit';
import NurseCaseView from './pages/NurseCaseView';
import DoctorCaseView from './pages/DoctorCaseView';
import ServiceDetail from './pages/ServiceDetail';
import LabDashboard from './pages/LabDashboard';
import Profile from './pages/Profile';

// Admin CMS Pages
import AdminLiveOps from './pages/admin/AdminLiveOps';
import AdminServices from './pages/admin/AdminServices';
import AdminPricing from './pages/admin/AdminPricing';
import AdminZones from './pages/admin/AdminZones';
import AdminNurses from './pages/admin/AdminNurses';
import AdminDoctors from './pages/admin/AdminDoctors';
import AdminLabTests from './pages/admin/AdminLabTests';
import AdminTemplates from './pages/admin/AdminTemplates';
import AdminFollowUps from './pages/admin/AdminFollowUps';
import AdminInventory from './pages/admin/AdminInventory';
import AdminPayments from './pages/admin/AdminPayments';
import AdminUseCases from './pages/admin/AdminUseCases';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';
import AdminSettings from './pages/admin/AdminSettings';

function App() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading-page">
                <div className="spinner" style={{ width: 32, height: 32 }}></div>
                <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
            </div>
        );
    }

    const getDefaultRoute = () => {
        if (!user) return '/login';
        switch (user.role) {
            case 'patient': return '/patient';
            case 'nurse': return '/nurse';
            case 'doctor': return '/doctor';
            case 'admin': return '/admin';
            case 'lab': return '/lab';
            default: return '/login';
        }
    };

    return (
        <Routes>
            <Route path="/login" element={user ? <Navigate to={getDefaultRoute()} /> : <LoginPage />} />
            <Route path="/register" element={user ? <Navigate to={getDefaultRoute()} /> : <RegisterPage />} />

            {/* Patient routes */}
            <Route path="/patient" element={<ProtectedRoute role="patient"><DashboardLayout><PatientDashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/patient/book" element={<ProtectedRoute role="patient"><DashboardLayout><BookVisit /></DashboardLayout></ProtectedRoute>} />
            <Route path="/patient/service/:id" element={<ProtectedRoute role="patient"><DashboardLayout><ServiceDetail /></DashboardLayout></ProtectedRoute>} />

            {/* Nurse routes */}
            <Route path="/nurse" element={<ProtectedRoute role="nurse"><DashboardLayout><NurseDashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/nurse/case/:id" element={<ProtectedRoute role="nurse"><DashboardLayout><NurseCaseView /></DashboardLayout></ProtectedRoute>} />

            {/* Doctor routes */}
            <Route path="/doctor" element={<ProtectedRoute role="doctor"><DashboardLayout><DoctorDashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/doctor/case/:id" element={<ProtectedRoute role="doctor"><DashboardLayout><DoctorCaseView /></DashboardLayout></ProtectedRoute>} />

            {/* Admin CMS routes */}
            <Route path="/admin" element={<ProtectedRoute role="admin"><DashboardLayout><AdminDashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/live" element={<ProtectedRoute role="admin"><DashboardLayout><AdminLiveOps /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/services" element={<ProtectedRoute role="admin"><DashboardLayout><AdminServices /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/pricing" element={<ProtectedRoute role="admin"><DashboardLayout><AdminPricing /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/zones" element={<ProtectedRoute role="admin"><DashboardLayout><AdminZones /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/nurses" element={<ProtectedRoute role="admin"><DashboardLayout><AdminNurses /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/doctors" element={<ProtectedRoute role="admin"><DashboardLayout><AdminDoctors /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/lab-tests" element={<ProtectedRoute role="admin"><DashboardLayout><AdminLabTests /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/templates" element={<ProtectedRoute role="admin"><DashboardLayout><AdminTemplates /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/follow-ups" element={<ProtectedRoute role="admin"><DashboardLayout><AdminFollowUps /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/inventory" element={<ProtectedRoute role="admin"><DashboardLayout><AdminInventory /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/payments" element={<ProtectedRoute role="admin"><DashboardLayout><AdminPayments /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/use-cases" element={<ProtectedRoute role="admin"><DashboardLayout><AdminUseCases /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/notifications" element={<ProtectedRoute role="admin"><DashboardLayout><AdminNotifications /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/audit-logs" element={<ProtectedRoute role="admin"><DashboardLayout><AdminAuditLogs /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute role="admin"><DashboardLayout><AdminSettings /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/control" element={<ProtectedRoute role="admin"><DashboardLayout><MasterControl /></DashboardLayout></ProtectedRoute>} />

            {/* Lab routes */}
            <Route path="/lab" element={<ProtectedRoute role="lab"><DashboardLayout><LabDashboard /></DashboardLayout></ProtectedRoute>} />

            {/* General Protected Routes */}
            <Route path="/profile" element={<ProtectedRoute><DashboardLayout><Profile /></DashboardLayout></ProtectedRoute>} />

            {/* Default redirect */}
            <Route path="*" element={<Navigate to={getDefaultRoute()} />} />
        </Routes>
    );
}

export default App;
