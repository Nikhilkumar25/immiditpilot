import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
    children: ReactNode;
    role?: string;
}

export default function ProtectedRoute({ children, role }: Props) {
    const { user, loading } = useAuth();

    if (loading) return <div className="loading-page"><div className="spinner" /></div>;
    if (!user) return <Navigate to="/login" />;
    if (role && user.role !== role) return <Navigate to={`/${user.role}`} />;

    return <>{children}</>;
}
