import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

let ioInstance: Server;

// UUID v4 format validator
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Simple per-socket rate limiter.
 * Limits events per socket to prevent abuse.
 */
function createSocketRateLimiter(maxEvents: number, windowMs: number) {
    const counters = new Map<string, { count: number; resetTime: number }>();

    return (socketId: string): boolean => {
        const now = Date.now();
        let entry = counters.get(socketId);

        if (!entry || now > entry.resetTime) {
            entry = { count: 0, resetTime: now + windowMs };
            counters.set(socketId, entry);
        }

        entry.count++;
        return entry.count <= maxEvents;
    };
}

export async function initSocketServer(httpServer: HttpServer): Promise<Server> {
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.NODE_ENV === 'production'
                ? (process.env.CLIENT_URL || '').split(',').map(s => s.trim())
                : '*',
            methods: ['GET', 'POST'],
            credentials: true,
        },
        // Cloud Run: allow longer ping intervals for serverless
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    // Attach Redis adapter if REDIS_URL is configured (required for multi-instance Cloud Run)
    if (process.env.REDIS_URL) {
        try {
            const { createAdapter } = await import('@socket.io/redis-adapter');
            const { default: Redis } = await import('ioredis');
            const pubClient = new Redis(process.env.REDIS_URL);
            const subClient = pubClient.duplicate();

            await Promise.all([
                new Promise<void>((resolve, reject) => {
                    pubClient.on('ready', resolve);
                    pubClient.on('error', reject);
                }),
                new Promise<void>((resolve, reject) => {
                    subClient.on('ready', resolve);
                    subClient.on('error', reject);
                }),
            ]);

            io.adapter(createAdapter(pubClient, subClient));
            console.log('✅ Socket.io Redis adapter connected — multi-instance ready');
        } catch (err) {
            console.warn('⚠️  Failed to connect Redis adapter, falling back to in-memory:', err);
        }
    } else {
        console.warn('⚠️  REDIS_URL not set — Socket.io using in-memory adapter (single-instance only)');
    }

    // JWT authentication middleware for socket connections
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        console.error('FATAL: JWT_SECRET not set — socket authentication will fail');
    }

    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication required'));
        }

        if (!jwtSecret) {
            return next(new Error('Server configuration error'));
        }

        try {
            const decoded = jwt.verify(token, jwtSecret) as {
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

    // Per-socket rate limiter: max 30 events per 10 seconds
    const rateLimiter = createSocketRateLimiter(30, 10000);

    // Prisma client for authorization queries
    const prisma = new PrismaClient();

    io.on('connection', (socket: Socket) => {
        const user = (socket as any).user;
        console.log(`🔌 Socket connected: ${user.name} (${user.role})`);

        // Join user-specific room
        socket.join(`user:${user.id}`);

        // Join role-based room
        socket.join(`role:${user.role}`);

        // Join service rooms with authorization
        socket.on('join_service', async (serviceId: string) => {
            // Rate limit check
            if (!rateLimiter(socket.id)) {
                socket.emit('error', { message: 'Rate limit exceeded' });
                return;
            }

            // Validate serviceId format
            if (!serviceId || typeof serviceId !== 'string' || !UUID_REGEX.test(serviceId)) {
                socket.emit('error', { message: 'Invalid service ID format' });
                return;
            }

            try {
                // Verify the user is a participant of this service
                const service = await prisma.serviceRequest.findUnique({
                    where: { id: serviceId },
                    select: { patientId: true, nurseId: true, doctorId: true },
                });

                if (!service) {
                    socket.emit('error', { message: 'Service not found' });
                    return;
                }

                const isParticipant =
                    service.patientId === user.id ||
                    service.nurseId === user.id ||
                    service.doctorId === user.id ||
                    user.role === 'admin'; // Admins can observe any service

                if (!isParticipant) {
                    socket.emit('error', { message: 'Unauthorized to join this service room' });
                    return;
                }

                socket.join(`service:${serviceId}`);
                console.log(`  → ${user.name} joined service:${serviceId}`);
            } catch (err) {
                console.error('Error validating service room join:', err);
                socket.emit('error', { message: 'Failed to join service room' });
            }
        });

        socket.on('leave_service', (serviceId: string) => {
            if (!rateLimiter(socket.id)) return;

            if (!serviceId || typeof serviceId !== 'string' || !UUID_REGEX.test(serviceId)) {
                return;
            }

            socket.leave(`service:${serviceId}`);
        });

        // ============ WebRTC Signaling ============

        // Doctor initiates a call to nurse
        socket.on('call_initiate', (data: { targetUserId: string; serviceId: string; offer: any; callerName: string }) => {
            if (!rateLimiter(socket.id)) return;
            console.log(`📞 Call initiated: ${user.name} → ${data.targetUserId} (service: ${data.serviceId})`);
            io.to(`user:${data.targetUserId}`).emit('call_incoming', {
                callerId: user.id,
                callerName: data.callerName || user.name,
                callerRole: user.role,
                serviceId: data.serviceId,
                offer: data.offer,
            });
        });

        // Nurse/target answers the call
        socket.on('call_answer', (data: { targetUserId: string; answer: any }) => {
            if (!rateLimiter(socket.id)) return;
            console.log(`📞 Call answered: ${user.name} → ${data.targetUserId}`);
            io.to(`user:${data.targetUserId}`).emit('call_answered', {
                answererId: user.id,
                answer: data.answer,
            });
        });

        // ICE candidate exchange (both directions)
        socket.on('call_ice_candidate', (data: { targetUserId: string; candidate: any }) => {
            if (!rateLimiter(socket.id)) return;
            io.to(`user:${data.targetUserId}`).emit('call_ice_candidate', {
                fromUserId: user.id,
                candidate: data.candidate,
            });
        });

        // End call (both sides can trigger)
        socket.on('call_end', (data: { targetUserId: string }) => {
            if (!rateLimiter(socket.id)) return;
            console.log(`📞 Call ended by: ${user.name}`);
            io.to(`user:${data.targetUserId}`).emit('call_ended', {
                endedBy: user.id,
            });
        });

        // Decline call
        socket.on('call_decline', (data: { targetUserId: string }) => {
            if (!rateLimiter(socket.id)) return;
            console.log(`📞 Call declined by: ${user.name}`);
            io.to(`user:${data.targetUserId}`).emit('call_declined', {
                declinedBy: user.id,
            });
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
