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
import BookVisit from './pages/BookVisit';
import NurseCaseView from './pages/NurseCaseView';
import DoctorCaseView from './pages/DoctorCaseView';
import ServiceDetail from './pages/ServiceDetail';
import LabDashboard from './pages/LabDashboard';

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

            {/* Admin routes */}
            <Route path="/admin" element={<ProtectedRoute role="admin"><DashboardLayout><AdminDashboard /></DashboardLayout></ProtectedRoute>} />

            {/* Lab routes */}
            <Route path="/lab" element={<ProtectedRoute role="lab"><DashboardLayout><LabDashboard /></DashboardLayout></ProtectedRoute>} />

            {/* Default redirect */}
            <Route path="*" element={<Navigate to={getDefaultRoute()} />} />
        </Routes>
    );
}

export default App;
