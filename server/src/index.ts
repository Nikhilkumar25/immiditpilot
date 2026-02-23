import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { initSocketServer } from './sockets/socketManager';
import { generalRateLimit, rateLimit } from './middleware/rateLimiter';

// Routes
import authRoutes from './routes/authRoutes';
import serviceRoutes from './routes/serviceRoutes';
import clinicalRoutes from './routes/clinicalRoutes';
import doctorRoutes from './routes/doctorRoutes';
import labRoutes from './routes/labRoutes';
import adminRoutes from './routes/adminRoutes';
import uploadRoutes from './routes/uploadRoutes';
import addressRoutes from './routes/addressRoutes';
import ratingRoutes from './routes/ratingRoutes';
import profileRoutes from './routes/profileRoutes';
import prescriptionRoutes from './routes/prescriptionRoutes';
import cmsRoutes from './routes/cmsRoutes';
import inventoryRoutes from './routes/inventoryRoutes';

// ============ STARTUP VALIDATION ============
if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is required');
    // For development, we might not want to exit, but in production it's critical
    if (process.env.NODE_ENV === 'production') process.exit(1);
}

export const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);

// ============ MIDDLEWARE ============

// Security headers
app.use(helmet({
    // Allow cross-origin for API usage
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
const allowedOrigins = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split('+').map(s => s.trim())
    : ['http://localhost:5173'];

app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? allowedOrigins
        : '*',
    credentials: true,
}));

// Body parsing with reasonable limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Files are served exclusively through signed URLs (no static file serving)

// Cloud Run: trust proxy for correct IP in rate limiting
app.set('trust proxy', true);

// Global rate limit — 100 requests/min per IP
app.use('/api', generalRateLimit);

// Health check (no auth required)
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth rate limit — 20 req/min (OTP route has its own stricter per-phone limit)
app.use('/api/auth', rateLimit(60 * 1000, 20));

// ============ ROUTES ============
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/clinical', clinicalRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api', prescriptionRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/inventory', inventoryRoutes);

// ============ START ============
async function start() {
    // Initialize Socket.io (may connect to Redis adapter)
    const io = await initSocketServer(server);
    // Make io accessible to controllers via module export
    (app as any).__io = io;

    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
        console.log(`🚀 Immidit server running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    });
}

start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

// Re-export io for use in controllers
let _io: any;
export function getServerIO() {
    if (_io) return _io;
    _io = (app as any).__io;
    return _io;
}
