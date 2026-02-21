import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../services/api';
import { getCaptchaToken } from '../utils/recaptcha';

interface User {
    id: string;
    email?: string;
    name: string;
    phone: string;
    role: 'patient' | 'nurse' | 'doctor' | 'admin' | 'lab';
    medicalRegNo?: string;
    createdAt: string;
    // Profile fields
    dateOfBirth?: string;
    gender?: string;
    age?: number;
    bloodGroup?: string;
    allergicInfo?: string;
    medicalHistory?: string;
    emergencyContact?: string;
    phoneVerified?: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (phone: string, password: string) => Promise<void>;
    sendOtp: (phone: string) => Promise<void>;
    verifyOtp: (phone: string, otp: string) => Promise<string>; // returns verificationToken
    register: (data: { phone: string; name: string; password: string; verificationToken: string }) => Promise<void>;
    forgotPassword: (phone: string) => Promise<void>;
    resetPassword: (phone: string, otp: string, password: string) => Promise<void>;
    logout: () => void;
    setUser: (user: User) => void;
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

    const handleAuthResponse = (data: any) => {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('immidit_token', data.token);
        localStorage.setItem('immidit_user', JSON.stringify(data.user));
        if (data.refreshToken) {
            localStorage.setItem('immidit_refresh_token', data.refreshToken);
        }
    };

    const login = async (phone: string, password: string) => {
        const { data } = await authApi.login({ phone, password });
        handleAuthResponse(data);
    };

    const sendOtp = async (phone: string) => {
        const captchaToken = await getCaptchaToken('send_otp');
        await authApi.sendOtp({ phone, captchaToken: captchaToken || undefined });
    };

    const verifyOtp = async (phone: string, otp: string): Promise<string> => {
        const { data } = await authApi.verifyOtp({ phone, otp });
        return data.verificationToken;
    };

    const register = async (data: { phone: string; name: string; password: string; verificationToken: string }) => {
        const { data: resData } = await authApi.register(data);
        handleAuthResponse(resData);
    };

    const forgotPassword = async (phone: string) => {
        const captchaToken = await getCaptchaToken('forgot_password');
        await authApi.forgotPassword({ phone, captchaToken: captchaToken || undefined });
    };

    const resetPassword = async (phone: string, otp: string, password: string) => {
        const { data } = await authApi.resetPassword({ phone, otp, password });
        handleAuthResponse(data);
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('immidit_token');
        localStorage.removeItem('immidit_refresh_token');
        localStorage.removeItem('immidit_user');
    };

    // Listen for silent token refreshes from the API interceptor
    useEffect(() => {
        const handler = (e: Event) => {
            const newToken = (e as CustomEvent).detail?.token;
            if (newToken) {
                setToken(newToken);
            }
        };
        window.addEventListener('token_refreshed', handler);
        return () => window.removeEventListener('token_refreshed', handler);
    }, []);

    return (
        <AuthContext.Provider value={{
            user, token, loading,
            login, sendOtp, verifyOtp, register,
            forgotPassword, resetPassword, logout, setUser,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
