import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { initSocketServer } from './sockets/socketManager';

// Routes
import authRoutes from './routes/authRoutes';
import serviceRoutes from './routes/serviceRoutes';
import clinicalRoutes from './routes/clinicalRoutes';
import doctorRoutes from './routes/doctorRoutes';
import labRoutes from './routes/labRoutes';
import adminRoutes from './routes/adminRoutes';
import uploadRoutes from './routes/uploadRoutes';
import addressRoutes from './routes/addressRoutes';

export const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = initSocketServer(server);
export { io };

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/clinical', clinicalRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/addresses', addressRoutes);

// Start
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Immidit server running on http://localhost:${PORT}`);
});
