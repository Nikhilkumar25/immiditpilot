/**
 * CAPTCHA verification middleware using Google reCAPTCHA v3.
 * 
 * Requires RECAPTCHA_SECRET_KEY env var in production.
 * Skipped in development when the key is not set.
 */

import { Request, Response, NextFunction } from 'express';

interface RecaptchaResponse {
    success: boolean;
    score?: number;
    action?: string;
    'error-codes'?: string[];
}

const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const MIN_SCORE = 0.5;

export async function verifyCaptcha(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Skip CAPTCHA entirely in non-production environments
    if (process.env.NODE_ENV !== 'production') {
        next();
        return;
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
        console.error('FATAL: RECAPTCHA_SECRET_KEY is required in production');
        res.status(500).json({ error: 'Server configuration error' });
        return;
    }

    const { captchaToken } = req.body;

    if (!captchaToken) {
        res.status(400).json({ error: 'CAPTCHA verification required' });
        return;
    }

    try {
        const params = new URLSearchParams({
            secret: secretKey,
            response: captchaToken,
            remoteip: req.ip || '',
        });

        const response = await fetch(RECAPTCHA_VERIFY_URL, {
            method: 'POST',
            body: params,
        });

        const data = (await response.json()) as RecaptchaResponse;

        if (!data.success) {
            console.warn('CAPTCHA verification failed:', data['error-codes']);
            res.status(403).json({ error: 'Security check failed. Please refresh the page and try again.' });
            return;
        }

        if (data.score !== undefined && data.score < MIN_SCORE) {
            console.warn(`CAPTCHA low score (${data.score}) from IP ${req.ip}`);
            res.status(403).json({ error: 'Our security system flagged this request. Please try again in a moment.' });
            return;
        }

        next();
    } catch (err) {
        console.error('CAPTCHA verification error:', err);
        // Fail-open if CAPTCHA service itself is down — don't block real users
        next();
    }
}
