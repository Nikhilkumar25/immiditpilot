import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCaptchaToken } from '../utils/recaptcha';
import { Phone, ArrowRight, ShieldCheck, Loader2, Lock, User, Eye, EyeOff } from 'lucide-react';

/**
 * Auth flow:
 * 1. LOGIN (default): phone + password → dashboard
 * 2. REGISTER: phone → OTP → verify → name + password form → dashboard
 * 3. FORGOT PASSWORD: phone → OTP → new password → dashboard
 */
type AuthMode =
    | 'login'
    | 'register-phone'    // Enter phone for registration
    | 'register-otp'      // Verify OTP for registration
    | 'register-form'     // Fill name + password after OTP verified
    | 'forgot-phone'      // Enter phone for forgot password
    | 'forgot-otp'        // Verify OTP for forgot password
    | 'forgot-newpwd';    // Set new password after OTP verified

export default function LoginPage() {
    const [mode, setMode] = useState<AuthMode>('login');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [verificationToken, setVerificationToken] = useState('');

    const { login, sendOtp, verifyOtp, register, forgotPassword, resetPassword } = useAuth();
    const navigate = useNavigate();
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (countdown > 0) {
            const t = setTimeout(() => setCountdown(c => c - 1), 1000);
            return () => clearTimeout(t);
        }
    }, [countdown]);

    // Preload reCAPTCHA script
    useEffect(() => {
        getCaptchaToken('preload').catch(() => { });
    }, []);

    // ============ LOGIN ============
    const handleLogin = async () => {
        if (phone.length !== 10) { setError('Enter a valid 10-digit phone number'); return; }
        if (!password) { setError('Password is required'); return; }
        setLoading(true);
        setError('');
        try {
            await login(phone, password);
            navigate('/patient');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    // ============ REGISTER — STEP 1: Send OTP ============
    const handleRegisterSendOtp = async () => {
        if (phone.length !== 10) { setError('Enter a valid 10-digit phone number'); return; }
        setLoading(true);
        setError('');
        try {
            await sendOtp(phone);
            setMode('register-otp');
            setCountdown(30);
            setOtp(['', '', '', '', '', '']);
            setTimeout(() => otpRefs.current[0]?.focus(), 100);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    // ============ REGISTER — STEP 2: Verify OTP ============
    const handleRegisterVerifyOtp = async (otpCode?: string) => {
        const code = otpCode || otp.join('');
        if (code.length !== 6) { setError('Enter the complete 6-digit OTP'); return; }
        setLoading(true);
        setError('');
        try {
            const vToken = await verifyOtp(phone, code);
            setVerificationToken(vToken);
            setMode('register-form');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Verification failed');
            setOtp(['', '', '', '', '', '']);
            otpRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    // ============ REGISTER — STEP 3: Submit registration ============
    const handleRegisterSubmit = async () => {
        if (!name.trim()) { setError('Name is required'); return; }
        if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
        if (password !== confirmPassword) { setError('Passwords do not match'); return; }
        setLoading(true);
        setError('');
        try {
            await register({ phone, name: name.trim(), password, verificationToken });
            navigate('/patient');
        } catch (err: any) {
            if (err.response?.status === 401) {
                // Verification token expired, start over
                setError('Phone verification expired. Please verify again.');
                setMode('register-phone');
            } else {
                setError(err.response?.data?.error || 'Registration failed');
            }
        } finally {
            setLoading(false);
        }
    };

    // ============ FORGOT PASSWORD — STEP 1: Send OTP ============
    const handleForgotSendOtp = async () => {
        if (phone.length !== 10) { setError('Enter a valid 10-digit phone number'); return; }
        setLoading(true);
        setError('');
        try {
            await forgotPassword(phone);
            setMode('forgot-otp');
            setCountdown(30);
            setOtp(['', '', '', '', '', '']);
            setTimeout(() => otpRefs.current[0]?.focus(), 100);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    // ============ FORGOT PASSWORD — STEP 2: Verify OTP & show new pwd ============
    const handleForgotVerifyOtp = async (otpCode?: string) => {
        const code = otpCode || otp.join('');
        if (code.length !== 6) { setError('Enter the complete 6-digit OTP'); return; }
        // Don't verify server-side yet — we'll send the OTP with reset-password
        // Just move to new password screen, keeping the OTP for the final request
        setMode('forgot-newpwd');
    };

    // ============ FORGOT PASSWORD — STEP 3: Reset password ============
    const handleResetPassword = async () => {
        if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
        if (password !== confirmPassword) { setError('Passwords do not match'); return; }
        setLoading(true);
        setError('');
        try {
            await resetPassword(phone, otp.join(''), password);
            navigate('/patient');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to reset password');
            if (err.response?.data?.error?.includes('OTP')) {
                setMode('forgot-otp');
                setOtp(['', '', '', '', '', '']);
            }
        } finally {
            setLoading(false);
        }
    };

    // ============ OTP INPUT HANDLERS ============
    const handleOtpChange = (index: number, value: string, submitFn: (code: string) => void) => {
        if (value.length > 1) value = value.slice(-1);
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 5) otpRefs.current[index + 1]?.focus();
        if (value && index === 5 && newOtp.every(d => d)) {
            submitFn(newOtp.join(''));
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent, submitFn: (code: string) => void) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const newOtp = [...otp];
        text.split('').forEach((char, i) => { newOtp[i] = char; });
        setOtp(newOtp);
        if (text.length === 6) submitFn(text);
        else otpRefs.current[text.length]?.focus();
    };

    // ============ SHARED UI ============
    const renderOtpInputs = (submitFn: (code: string) => void) => (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }} onPaste={e => handleOtpPaste(e, submitFn)}>
            {otp.map((digit, i) => (
                <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value, submitFn)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    style={{
                        width: 48, height: 56, textAlign: 'center',
                        fontSize: '1.25rem', fontWeight: 700,
                        border: `2px solid ${digit ? 'var(--primary)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-md)',
                        outline: 'none', transition: 'var(--transition)',
                        background: digit ? 'var(--primary-bg)' : 'var(--surface)',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'var(--primary)'; }}
                    onBlur={e => { if (!digit) e.target.style.borderColor = 'var(--border)'; }}
                />
            ))}
        </div>
    );

    const renderPasswordField = (label: string, value: string, onChange: (v: string) => void, placeholder: string) => (
        <div className="form-group">
            <label className="form-label">{label}</label>
            <div style={{ position: 'relative' }}>
                <span style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
                }}>
                    <Lock size={14} />
                </span>
                <input
                    className="form-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={placeholder}
                    value={value}
                    onChange={e => { onChange(e.target.value); setError(''); }}
                    style={{ paddingLeft: 40, paddingRight: 40 }}
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: 'var(--text-secondary)',
                        cursor: 'pointer', padding: 4,
                    }}
                >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
        </div>
    );

    const renderPhoneInput = (autoFocus = true) => (
        <div className="form-group">
            <label className="form-label">Phone Number</label>
            <div style={{ position: 'relative' }}>
                <span style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 4
                }}>
                    <Phone size={14} /> +91
                </span>
                <input
                    className="form-input"
                    type="tel"
                    placeholder="Enter 10-digit number"
                    maxLength={10}
                    value={phone}
                    onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setError(''); }}
                    style={{ paddingLeft: 80 }}
                    autoFocus={autoFocus}
                />
            </div>
        </div>
    );

    const renderResendButton = (resendFn: () => void) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.813rem' }}>
            {countdown > 0 ? (
                <span style={{ color: 'var(--text-muted)' }}>Resend in {countdown}s</span>
            ) : (
                <button
                    onClick={() => { resendFn(); setOtp(['', '', '', '', '', '']); }}
                    style={{
                        background: 'none', border: 'none', color: 'var(--primary)',
                        fontWeight: 600, cursor: 'pointer', fontSize: '0.813rem'
                    }}
                >
                    Resend OTP
                </button>
            )}
        </div>
    );

    const renderBackLink = (label: string, targetMode: AuthMode) => (
        <div style={{ textAlign: 'center', fontSize: '0.813rem', marginTop: 'var(--space-xs)' }}>
            <button
                onClick={() => {
                    setMode(targetMode);
                    setError('');
                    setPassword('');
                    setConfirmPassword('');
                    setOtp(['', '', '', '', '', '']);
                }}
                style={{
                    background: 'none', border: 'none', color: 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: '0.813rem'
                }}
            >
                ← {label}
            </button>
        </div>
    );

    // ============ RENDER ============
    const subtitles: Record<AuthMode, string> = {
        'login': 'Sign in with your phone number and password',
        'register-phone': 'Enter your phone number to get started',
        'register-otp': `Enter the OTP sent to +91 ${phone}`,
        'register-form': 'Set up your account',
        'forgot-phone': 'Enter your phone number to reset password',
        'forgot-otp': `Enter the OTP sent to +91 ${phone}`,
        'forgot-newpwd': 'Set your new password',
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">Immidit</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
                    {subtitles[mode]}
                </p>

                {error && (
                    <div style={{
                        background: 'hsl(0, 90%, 96%)', border: '1px solid hsl(0, 70%, 85%)',
                        color: 'hsl(0, 70%, 45%)', padding: '10px 14px', borderRadius: 'var(--radius-md)',
                        fontSize: '0.813rem', marginBottom: 'var(--space-md)', textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                {/* ========== LOGIN ========== */}
                {mode === 'login' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        {renderPhoneInput()}
                        {renderPasswordField('Password', password, setPassword, 'Enter your password')}

                        <button
                            className="btn btn-primary btn-lg btn-block"
                            onClick={handleLogin}
                            disabled={loading || phone.length !== 10 || !password}
                        >
                            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : (
                                <>Login <ArrowRight size={18} /></>
                            )}
                        </button>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                            <button
                                onClick={() => { setMode('forgot-phone'); setError(''); setPassword(''); }}
                                style={{
                                    background: 'none', border: 'none', color: 'var(--text-muted)',
                                    cursor: 'pointer', fontSize: '0.813rem'
                                }}
                            >
                                Forgot Password?
                            </button>
                            <button
                                onClick={() => { setMode('register-phone'); setError(''); setPassword(''); }}
                                style={{
                                    background: 'none', border: 'none', color: 'var(--primary)',
                                    fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem'
                                }}
                            >
                                Register
                            </button>
                        </div>
                    </div>
                )}

                {/* ========== REGISTER — Phone ========== */}
                {mode === 'register-phone' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        {renderPhoneInput()}

                        <button
                            className="btn btn-primary btn-lg btn-block"
                            onClick={handleRegisterSendOtp}
                            disabled={loading || phone.length !== 10}
                        >
                            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : (
                                <>Send OTP <ArrowRight size={18} /></>
                            )}
                        </button>

                        <div style={{ textAlign: 'center', fontSize: '0.875rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Already have an account? </span>
                            <button
                                onClick={() => { setMode('login'); setError(''); }}
                                style={{
                                    background: 'none', border: 'none', color: 'var(--primary)',
                                    fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem'
                                }}
                            >
                                Login
                            </button>
                        </div>
                    </div>
                )}

                {/* ========== REGISTER — OTP ========== */}
                {mode === 'register-otp' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', alignItems: 'center' }}>
                        {renderOtpInputs(handleRegisterVerifyOtp)}

                        <button
                            className="btn btn-primary btn-lg btn-block"
                            onClick={() => handleRegisterVerifyOtp()}
                            disabled={loading || otp.some(d => !d)}
                        >
                            {loading ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Verifying...
                                </span>
                            ) : (
                                <><ShieldCheck size={18} /> Verify OTP</>
                            )}
                        </button>

                        {renderResendButton(handleRegisterSendOtp)}
                        {renderBackLink('Change Number', 'register-phone')}
                    </div>
                )}

                {/* ========== REGISTER — Form (after OTP verified) ========== */}
                {mode === 'register-form' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        <div style={{
                            background: 'hsl(142, 70%, 95%)', border: '1px solid hsl(142, 50%, 75%)',
                            color: 'hsl(142, 50%, 30%)', padding: '10px 14px', borderRadius: 'var(--radius-md)',
                            fontSize: '0.813rem', textAlign: 'center'
                        }}>
                            ✓ Phone +91 {phone} verified
                        </div>

                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{
                                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                                    color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
                                }}>
                                    <User size={14} />
                                </span>
                                <input
                                    className="form-input"
                                    type="text"
                                    placeholder="Enter your full name"
                                    value={name}
                                    onChange={e => { setName(e.target.value); setError(''); }}
                                    style={{ paddingLeft: 40 }}
                                    autoFocus
                                />
                            </div>
                        </div>

                        {renderPasswordField('Password', password, setPassword, 'Minimum 8 characters')}
                        {renderPasswordField('Confirm Password', confirmPassword, setConfirmPassword, 'Re-enter password')}

                        <button
                            className="btn btn-primary btn-lg btn-block"
                            onClick={handleRegisterSubmit}
                            disabled={loading || !name.trim() || password.length < 8 || password !== confirmPassword}
                        >
                            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : (
                                <>Create Account <ArrowRight size={18} /></>
                            )}
                        </button>
                    </div>
                )}

                {/* ========== FORGOT PASSWORD — Phone ========== */}
                {mode === 'forgot-phone' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        {renderPhoneInput()}

                        <button
                            className="btn btn-primary btn-lg btn-block"
                            onClick={handleForgotSendOtp}
                            disabled={loading || phone.length !== 10}
                        >
                            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : (
                                <>Send OTP <ArrowRight size={18} /></>
                            )}
                        </button>

                        {renderBackLink('Back to Login', 'login')}
                    </div>
                )}

                {/* ========== FORGOT PASSWORD — OTP ========== */}
                {mode === 'forgot-otp' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', alignItems: 'center' }}>
                        {renderOtpInputs(handleForgotVerifyOtp)}

                        <button
                            className="btn btn-primary btn-lg btn-block"
                            onClick={() => handleForgotVerifyOtp()}
                            disabled={loading || otp.some(d => !d)}
                        >
                            {loading ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Verifying...
                                </span>
                            ) : (
                                <><ShieldCheck size={18} /> Verify OTP</>
                            )}
                        </button>

                        {renderResendButton(handleForgotSendOtp)}
                        {renderBackLink('Back', 'forgot-phone')}
                    </div>
                )}

                {/* ========== FORGOT PASSWORD — New Password ========== */}
                {mode === 'forgot-newpwd' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        {renderPasswordField('New Password', password, setPassword, 'Minimum 8 characters')}
                        {renderPasswordField('Confirm Password', confirmPassword, setConfirmPassword, 'Re-enter password')}

                        <button
                            className="btn btn-primary btn-lg btn-block"
                            onClick={handleResetPassword}
                            disabled={loading || password.length < 8 || password !== confirmPassword}
                        >
                            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : (
                                <>Reset Password <ArrowRight size={18} /></>
                            )}
                        </button>

                        {renderBackLink('Back to Login', 'login')}
                    </div>
                )}

                <div style={{ marginTop: 'var(--space-md)', textAlign: 'center', opacity: 0.4 }}>
                    <small style={{ fontSize: '0.7rem', lineHeight: 1.2, display: 'block' }}>
                        This site is protected by reCAPTCHA and the Google{' '} <br />
                        <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>Privacy Policy</a> and{' '}
                        <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>Terms of Service</a> apply.
                    </small>
                </div>
            </div>
        </div>
    );
}
