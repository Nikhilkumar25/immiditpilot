import { Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth';
import { generateOTP, verifyOTP } from '../services/otpService';

const SALT_ROUNDS = 12;

// ============ LOGIN ============

/**
 * Login with phone + password.
 * POST /api/auth/login
 * Body: { phone: string, password: string }
 */
export async function login(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { phone, password } = req.body;

        if (!phone || !password) {
            res.status(400).json({ error: 'Phone and password required' });
            return;
        }

        const user = await prisma.user.findUnique({ where: { phone } });

        if (!user || !user.passwordHash) {
            res.status(401).json({ error: 'Invalid phone number or password' });
            return;
        }

        const passwordValid = await bcrypt.compare(password, user.passwordHash);
        if (!passwordValid) {
            res.status(401).json({ error: 'Invalid phone number or password' });
            return;
        }

        // Generate new session token — invalidates all previous sessions
        const sessionToken = crypto.randomUUID();
        await prisma.user.update({
            where: { id: user.id },
            data: { sessionToken },
        });

        const token = signJwt(user.id, user.phone, user.role, user.name, sessionToken);
        const refreshToken = signRefreshToken(user.id, sessionToken);

        res.json({
            token,
            refreshToken,
            user: sanitizeUser(user),
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
}

// ============ SEND OTP (for registration & forgot password) ============

/**
 * Send OTP to a phone number.
 * Protected by CAPTCHA + phone rate limit.
 * POST /api/auth/send-otp
 * Body: { phone: string, captchaToken?: string }
 */
export async function sendOtp(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { phone } = req.body;

        if (!phone || !/^\d{10}$/.test(phone)) {
            res.status(400).json({ error: 'Valid 10-digit phone number required' });
            return;
        }

        generateOTP(phone);

        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (err) {
        console.error('SendOtp error:', err);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
}

// ============ VERIFY OTP ============

/**
 * Verify OTP for a phone number.
 * Returns a short-lived verification token that proves the phone was verified.
 * This token is required for registration and password reset.
 * POST /api/auth/verify-otp
 * Body: { phone: string, otp: string }
 */
export async function verifyOtpHandler(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            res.status(400).json({ error: 'Phone and OTP required' });
            return;
        }

        const result = verifyOTP(phone, otp);
        if (!result.valid) {
            res.status(401).json({ error: result.error });
            return;
        }

        // Save partial user record if doesn't exist (useful for marketing/analytics)
        let user = await prisma.user.findUnique({ where: { phone } });
        if (!user) {
            user = await prisma.user.create({
                data: {
                    phone,
                    name: '',
                    role: 'patient',
                    phoneVerified: true,
                },
            });
        } else if (!user.phoneVerified) {
            await prisma.user.update({
                where: { id: user.id },
                data: { phoneVerified: true },
            });
        }

        // Issue a short-lived verification token (10 minutes)
        const jwtSecret = process.env.JWT_SECRET!;
        const verificationToken = jwt.sign(
            { phone, purpose: 'phone_verified' },
            jwtSecret,
            { expiresIn: '10m' }
        );

        res.json({ success: true, verificationToken });
    } catch (err) {
        console.error('VerifyOtp error:', err);
        res.status(500).json({ error: 'Verification failed' });
    }
}

// ============ REGISTER ============

/**
 * Register a new user. Requires a valid verification token (OTP must be verified first).
 * POST /api/auth/register
 * Body: { phone: string, name: string, password: string, verificationToken: string }
 */
export async function register(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { phone, name, password, verificationToken } = req.body;

        if (!phone || !/^\d{10}$/.test(phone)) {
            res.status(400).json({ error: 'Valid 10-digit phone number required' });
            return;
        }
        if (!name || !name.trim()) {
            res.status(400).json({ error: 'Name is required' });
            return;
        }
        if (!password || password.length < 8) {
            res.status(400).json({ error: 'Password must be at least 8 characters' });
            return;
        }
        if (!verificationToken) {
            res.status(400).json({ error: 'Phone verification required before registration' });
            return;
        }

        // Validate verification token
        const jwtSecret = process.env.JWT_SECRET!;
        let decoded: { phone: string; purpose: string };
        try {
            decoded = jwt.verify(verificationToken, jwtSecret) as { phone: string; purpose: string };
        } catch {
            res.status(401).json({ error: 'Phone verification expired. Please verify your phone again.' });
            return;
        }

        if (decoded.purpose !== 'phone_verified' || decoded.phone !== phone) {
            res.status(401).json({ error: 'Invalid verification token' });
            return;
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        const sessionToken = crypto.randomUUID();

        // Check if partial user already exists (created during OTP verification)
        const existing = await prisma.user.findUnique({ where: { phone } });

        let user;
        if (existing) {
            // If they already have a password, they're fully registered
            if (existing.passwordHash) {
                res.status(409).json({ error: 'An account with this phone number already exists. Please login instead.' });
                return;
            }

            // Complete the partial registration
            user = await prisma.user.update({
                where: { id: existing.id },
                data: {
                    name: name.trim(),
                    passwordHash,
                    phoneVerified: true,
                    sessionToken,
                },
            });
        } else {
            // Fresh registration (shouldn't normally happen since OTP creates the record)
            user = await prisma.user.create({
                data: {
                    name: name.trim(),
                    phone,
                    role: 'patient',
                    passwordHash,
                    phoneVerified: true,
                    sessionToken,
                },
            });
        }

        const token = signJwt(user.id, user.phone, user.role, user.name, sessionToken);
        const refreshToken = signRefreshToken(user.id, sessionToken);

        res.status(201).json({
            token,
            refreshToken,
            user: sanitizeUser(user),
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
}

// ============ FORGOT PASSWORD — Send OTP ============

/**
 * Send OTP for password reset. User must exist.
 * POST /api/auth/forgot-password
 * Body: { phone: string, captchaToken?: string }
 */
export async function forgotPassword(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { phone } = req.body;

        if (!phone || !/^\d{10}$/.test(phone)) {
            res.status(400).json({ error: 'Valid 10-digit phone number required' });
            return;
        }

        const user = await prisma.user.findUnique({ where: { phone } });
        if (!user) {
            // Don't reveal if account exists — just say OTP sent
            res.json({ success: true, message: 'If an account exists, an OTP has been sent.' });
            return;
        }

        generateOTP(phone);

        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (err) {
        console.error('ForgotPassword error:', err);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
}

// ============ RESET PASSWORD ============

/**
 * Reset password using OTP verification.
 * POST /api/auth/reset-password
 * Body: { phone: string, otp: string, password: string }
 */
export async function resetPassword(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { phone, otp, password } = req.body;

        if (!phone || !otp || !password) {
            res.status(400).json({ error: 'Phone, OTP, and new password required' });
            return;
        }
        if (password.length < 8) {
            res.status(400).json({ error: 'Password must be at least 8 characters' });
            return;
        }

        const user = await prisma.user.findUnique({ where: { phone } });
        if (!user) {
            res.status(404).json({ error: 'Account not found' });
            return;
        }

        // Verify OTP
        const result = verifyOTP(phone, otp);
        if (!result.valid) {
            res.status(401).json({ error: result.error });
            return;
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        const sessionToken = crypto.randomUUID();

        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash, sessionToken },
        });

        const token = signJwt(user.id, user.phone, user.role, user.name, sessionToken);
        const refreshToken = signRefreshToken(user.id, sessionToken);

        res.json({
            token,
            refreshToken,
            user: sanitizeUser(user),
        });
    } catch (err) {
        console.error('ResetPassword error:', err);
        res.status(500).json({ error: 'Failed to reset password' });
    }
}

// ============ GET ME ============

/**
 * Get current authenticated user
 * GET /api/auth/me
 */
export async function getMe(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true, email: true, name: true, phone: true,
                role: true, createdAt: true, dateOfBirth: true,
                gender: true, bloodGroup: true, emergencyContact: true,
                phoneVerified: true,
            },
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

// ============ REFRESH TOKEN ============

/**
 * Exchange a valid refresh token for a new access token.
 * POST /api/auth/refresh
 * Body: { refreshToken: string }
 */
export async function refreshAccessToken(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            res.status(400).json({ error: 'refreshToken is required' });
            return;
        }

        const refreshSecret = process.env.JWT_REFRESH_SECRET;
        if (!refreshSecret) {
            console.error('FATAL: JWT_REFRESH_SECRET not set');
            res.status(500).json({ error: 'Server configuration error' });
            return;
        }

        let decoded: { id: string; sessionToken: string };
        try {
            decoded = jwt.verify(refreshToken, refreshSecret) as { id: string; sessionToken: string };
        } catch {
            res.status(401).json({ error: 'Invalid or expired refresh token' });
            return;
        }

        // Validate session token against DB (single-device enforcement)
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
        });

        if (!user) {
            res.status(401).json({ error: 'User not found' });
            return;
        }

        if (user.sessionToken !== decoded.sessionToken) {
            res.status(401).json({
                error: 'Session expired. You were logged in on another device.',
                code: 'SESSION_INVALIDATED',
            });
            return;
        }

        // Issue a new short-lived access token (do NOT rotate refresh token)
        const token = signJwt(user.id, user.phone, user.role, user.name, user.sessionToken!);

        res.json({ token });
    } catch (err) {
        console.error('Refresh token error:', err);
        res.status(500).json({ error: 'Failed to refresh token' });
    }
}

// ============ HELPERS ============

function signJwt(id: string, phone: string, role: string, name: string, sessionToken: string): string {
    const jwtSecret = process.env.JWT_SECRET!;
    return jwt.sign(
        { id, phone, role, name, sessionToken },
        jwtSecret,
        { expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any }
    );
}

function signRefreshToken(id: string, sessionToken: string): string {
    const refreshSecret = process.env.JWT_REFRESH_SECRET!;
    return jwt.sign(
        { id, sessionToken },
        refreshSecret,
        { expiresIn: (process.env.REFRESH_TOKEN_EXPIRES_IN || '365d') as any }
    );
}

function sanitizeUser(user: any) {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
        phoneVerified: user.phoneVerified,
    };
}
