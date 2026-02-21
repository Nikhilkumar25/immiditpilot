/**
 * OTP Service — In-memory OTP store
 * 
 * TODO: Replace console.log with actual SMS service (Twilio, MSG91, etc.)
 * To integrate a real SMS provider, implement the `sendOTP` function below.
 */

import dotenv from 'dotenv';
dotenv.config();

interface OtpEntry {
    code: string;
    expiresAt: number;
    attempts: number;
}

const otpStore = new Map<string, OtpEntry>();

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;

function generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate and store an OTP for the given phone number.
 * Logs the OTP to the console for development.
 */
export function generateOTP(phone: string): string {
    const code = generateCode();
    otpStore.set(phone, {
        code,
        expiresAt: Date.now() + OTP_EXPIRY_MS,
        attempts: 0,
    });

    // ===== SEND OTP =====
    // TODO: Replace this with actual SMS delivery
    sendOTP(phone, code);

    return code;
}

/**
 * Verify the OTP for the given phone number.
 * Returns true if valid, false otherwise.
 */
export function verifyOTP(phone: string, code: string): { valid: boolean; error?: string } {
    const entry = otpStore.get(phone);

    if (!entry) {
        return { valid: false, error: 'No OTP found. Please request a new one.' };
    }

    if (Date.now() > entry.expiresAt) {
        otpStore.delete(phone);
        return { valid: false, error: 'OTP expired. Please request a new one.' };
    }

    if (entry.attempts >= MAX_ATTEMPTS) {
        otpStore.delete(phone);
        return { valid: false, error: 'Too many attempts. Please request a new OTP.' };
    }

    entry.attempts++;

    if (entry.code !== code) {
        return { valid: false, error: 'Invalid OTP. Please try again.' };
    }

    // Valid — clean up
    otpStore.delete(phone);
    return { valid: true };
}

/**
 * Send an OTP via SMS.
 * Currently logs to console. Replace with real SMS provider.
 * 
 * Example Twilio integration:
 * ```
 * import twilio from 'twilio';
 * const client = twilio(ACCOUNT_SID, AUTH_TOKEN);
 * await client.messages.create({
 *     body: `Your Immidit OTP is: ${otp}`,
 *     from: TWILIO_PHONE,
 *     to: `+91${phone}`
 * });
 * ```
 */

async function sendRealSMS(phone: string, otp: string) {
    const apiKey = process.env.FASTAPI_KEY;

    if (!apiKey) {
        console.error('❌ FASTAPI_KEY (Fast2SMS) is not defined in environment variables. OTP not sent via SMS.');
        return;
    }

    try {
        const message = `Your Immidit user verification code is: ${otp}`;

        // Fast2SMS Bulk V2 API
        // Docs: https://www.fast2sms.com/dev/bulkV2
        const url = new URL('https://www.fast2sms.com/dev/bulkV2');
        url.searchParams.append('authorization', apiKey);
        url.searchParams.append('route', 'q');
        url.searchParams.append('message', message);
        url.searchParams.append('flash', '0');
        url.searchParams.append('numbers', phone);
        // url.searchParams.append('schedule_time', ''); // Optional, leaving empty as per requirement if not scheduling

        const response = await fetch(url.toString(), {
            method: 'GET',
        });

        const data = await response.json() as any;

        if (data.return === true) {
            console.log('✅ SMS sent successfully via Fast2SMS');
        } else {
            console.error('❌ Failed to send SMS via Fast2SMS:', data.message || data);
        }
    } catch (error) {
        console.error('❌ Error sending OTP via Fast2SMS:', error);
    }
}


async function sendOTP(phone: string, otp: string): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
        sendRealSMS(phone, otp);
    }
    else {
        console.log(`\n📱 ============ OTP ============`);
        console.log(`   Phone: +91${phone}`);
        console.log(`   OTP:   ${otp}`);
        console.log(`   Expires in 5 minutes`);
        console.log(`   ==============================\n`);

    }
}

// Cleanup expired OTPs every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [phone, entry] of otpStore.entries()) {
        if (now > entry.expiresAt) {
            otpStore.delete(phone);
        }
    }
}, 10 * 60 * 1000);
