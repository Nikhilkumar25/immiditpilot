import { Router } from 'express';
import {
    login,
    sendOtp,
    verifyOtpHandler,
    register,
    forgotPassword,
    resetPassword,
    refreshAccessToken,
    getMe,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { verifyCaptcha } from '../middleware/captcha';
import { otpPhoneRateLimit } from '../middleware/rateLimiter';

const router = Router();

// Public auth routes
router.post('/login', login);
router.post('/register', register);
router.post('/refresh', refreshAccessToken);

// OTP routes — protected by phone rate limit + CAPTCHA
router.post('/send-otp', otpPhoneRateLimit, verifyCaptcha, sendOtp);
router.post('/verify-otp', verifyOtpHandler);

// Forgot password — same protection as OTP
router.post('/forgot-password', otpPhoneRateLimit, verifyCaptcha, forgotPassword);
router.post('/reset-password', resetPassword);

// Requires authentication
router.get('/me', authenticate, getMe);

export default router;
