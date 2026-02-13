import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

let ioInstance: Server;

export function initSocketServer(httpServer: HttpServer): Server {
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:5173',
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    // JWT authentication middleware for socket connections
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication required'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as {
                id: string;
                role: string;
                name: string;
            };
            (socket as any).user = decoded;
            next();
        } catch {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket: Socket) => {
        const user = (socket as any).user;
        console.log(`🔌 Socket connected: ${user.name} (${user.role})`);

        // Join user-specific room
        socket.join(`user:${user.id}`);

        // Join role-based room
        socket.join(`role:${user.role}`);

        // Join service rooms on request
        socket.on('join_service', (serviceId: string) => {
            socket.join(`service:${serviceId}`);
            console.log(`  → ${user.name} joined service:${serviceId}`);
        });

        socket.on('leave_service', (serviceId: string) => {
            socket.leave(`service:${serviceId}`);
        });

        socket.on('disconnect', () => {
            console.log(`🔌 Socket disconnected: ${user.name}`);
        });
    });

    ioInstance = io;
    return io;
}

export function getIO(): Server {
    return ioInstance;
}
