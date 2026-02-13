import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
    socket: Socket | null;
    joinService: (serviceId: string) => void;
    leaveService: (serviceId: string) => void;
}

const SocketContext = createContext<SocketContextType>({ socket: null, joinService: () => { }, leaveService: () => { } });

export function SocketProvider({ children }: { children: ReactNode }) {
    const { token, user } = useAuth();
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!token || !user) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            return;
        }

        const socket = io(window.location.origin, {
            auth: { token },
            transports: ['websocket', 'polling'],
        });

        socket.on('connect', () => {
            console.log('🔌 Socket connected');
        });

        socket.on('disconnect', () => {
            console.log('🔌 Socket disconnected');
        });

        socketRef.current = socket;

        return () => {
            socket.disconnect();
        };
    }, [token, user]);

    const joinService = (serviceId: string) => {
        socketRef.current?.emit('join_service', serviceId);
    };

    const leaveService = (serviceId: string) => {
        socketRef.current?.emit('leave_service', serviceId);
    };

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, joinService, leaveService }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    return useContext(SocketContext);
}
