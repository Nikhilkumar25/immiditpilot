import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
    socket: Socket | null;
    connected: boolean;
    joinService: (serviceId: string) => void;
    leaveService: (serviceId: string) => void;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    connected: false,
    joinService: () => { },
    leaveService: () => { },
});

// Backend URL for Socket.IO — must point to Cloud Run, NOT Vercel
const BACKEND_URL = import.meta.env.VITE_PUBLIC_BACKEND_URL || '';

export function SocketProvider({ children }: { children: ReactNode }) {
    const { token, user } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!token || !user) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setSocket(null);
                setConnected(false);
            }
            return;
        }

        const newSocket = io(BACKEND_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 10000,
        });

        newSocket.on('connect', () => {
            console.log('🔌 Socket connected');
            setConnected(true);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('🔌 Socket disconnected:', reason);
            setConnected(false);
        });

        newSocket.on('connect_error', (err) => {
            console.error('🔌 Socket connection error:', err.message);
            setConnected(false);
        });

        // Listen for token refreshes from the API interceptor
        const onTokenRefreshed = (e: Event) => {
            const newToken = (e as CustomEvent).detail?.token;
            if (newToken && newSocket.connected) {
                (newSocket.auth as any).token = newToken;
                newSocket.disconnect().connect();
            }
        };
        window.addEventListener('token_refreshed', onTokenRefreshed);

        socketRef.current = newSocket;
        setSocket(newSocket);

        return () => {
            window.removeEventListener('token_refreshed', onTokenRefreshed);
            newSocket.disconnect();
            setSocket(null);
            setConnected(false);
        };
    }, [token, user]);

    const joinService = (serviceId: string) => {
        socketRef.current?.emit('join_service', serviceId);
    };

    const leaveService = (serviceId: string) => {
        socketRef.current?.emit('leave_service', serviceId);
    };

    return (
        <SocketContext.Provider value={{ socket, connected, joinService, leaveService }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    return useContext(SocketContext);
}
