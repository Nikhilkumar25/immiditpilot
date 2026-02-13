import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth';

export async function register(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { email, password, name, phone, role } = req.body;

        if (!email || !password || !name || !phone || !role) {
            res.status(400).json({ error: 'All fields required: email, password, name, phone, role' });
            return;
        }

        const validRoles = ['patient', 'nurse', 'doctor', 'admin'];
        if (!validRoles.includes(role)) {
            res.status(400).json({ error: 'Invalid role' });
            return;
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            res.status(409).json({ error: 'Email already registered' });
            return;
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await prisma.user.create({
            data: { email, passwordHash, name, phone, role: role as any },
        });

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            token,
            user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role, createdAt: user.createdAt },
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
}

export async function login(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'Email and password required' });
            return;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role, createdAt: user.createdAt },
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json({ user });
    } catch (err) {
        console.error('GetMe error:', err);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
}
