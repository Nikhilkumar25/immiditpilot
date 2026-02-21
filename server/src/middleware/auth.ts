import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

// Lazy import to avoid circular dependency with index.ts
let _prisma: PrismaClient | null = null;
function getPrisma(): PrismaClient {
    if (!_prisma) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        _prisma = require('../index').prisma;
    }
    return _prisma!;
}

export interface AuthRequest extends Request {
    user?: {
        id: string;
        phone: string;
        role: string;
        name: string;
    };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'No token provided' });
        return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        console.error('FATAL: JWT_SECRET environment variable is not set');
        res.status(500).json({ error: 'Server configuration error' });
        return;
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, jwtSecret) as {
            id: string;
            phone: string;
            role: string;
            name: string;
            sessionToken?: string;
        };

        // Validate session token against DB to enforce single-device login
        if (decoded.sessionToken) {
            const prisma = getPrisma();
            const user = await prisma.user.findUnique({
                where: { id: decoded.id },
                select: { sessionToken: true },
            });

            if (!user || user.sessionToken !== decoded.sessionToken) {
                res.status(401).json({
                    error: 'Session expired. You were logged in on another device.',
                    code: 'SESSION_INVALIDATED',
                });
                return;
            }
        }

        req.user = {
            id: decoded.id,
            phone: decoded.phone,
            role: decoded.role,
            name: decoded.name,
        };
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

export const authorize = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Insufficient permissions' });
            return;
        }
        next();
    };
};
