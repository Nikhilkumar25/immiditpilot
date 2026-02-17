import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../services/api';

interface User {
    id: string;
    email: string;
    name: string;
    phone: string;
    role: 'patient' | 'nurse' | 'doctor' | 'admin' | 'lab';
    gender?: string;
    age?: number;
    bloodGroup?: string;
    allergicInfo?: string;
    medicalHistory?: string;
    createdAt: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (data: { email: string; password: string; name: string; phone: string; role: string }) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedToken = localStorage.getItem('immidit_token');
        const savedUser = localStorage.getItem('immidit_user');
        if (savedToken && savedUser) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        const { data } = await authApi.login({ email, password });
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('immidit_token', data.token);
        localStorage.setItem('immidit_user', JSON.stringify(data.user));
    };

    const register = async (registerData: { email: string; password: string; name: string; phone: string; role: string }) => {
        const { data } = await authApi.register(registerData);
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('immidit_token', data.token);
        localStorage.setItem('immidit_user', JSON.stringify(data.user));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('immidit_token');
        localStorage.removeItem('immidit_user');
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
