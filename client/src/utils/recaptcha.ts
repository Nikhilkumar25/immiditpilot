/**
 * Google reCAPTCHA v3 client-side helper.
 * Loads the script once, then provides a function to get tokens for actions.
 */

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';

let scriptLoaded = false;
let loadPromise: Promise<void> | null = null;

/**
 * Load the reCAPTCHA v3 script. Idempotent — safe to call multiple times.
 */
function loadScript(): Promise<void> {
    if (scriptLoaded) return Promise.resolve();
    if (loadPromise) return loadPromise;

    if (!SITE_KEY) {
        console.warn('reCAPTCHA site key not configured — skipping CAPTCHA');
        return Promise.resolve();
    }

    loadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
        script.async = true;
        script.onload = () => {
            scriptLoaded = true;
            resolve();
        };
        script.onerror = () => reject(new Error('Failed to load reCAPTCHA'));
        document.head.appendChild(script);
    });

    return loadPromise;
}

/**
 * Get a reCAPTCHA v3 token for the given action.
 * Returns empty string if reCAPTCHA is not configured (dev mode).
 */
export async function getCaptchaToken(action: string = 'send_otp'): Promise<string> {
    if (!SITE_KEY) return '';

    try {
        await loadScript();
        const grecaptcha = (window as any).grecaptcha;
        if (!grecaptcha) return '';

        return await new Promise<string>((resolve) => {
            grecaptcha.ready(() => {
                grecaptcha.execute(SITE_KEY, { action }).then(resolve);
            });
        });
    } catch (err) {
        console.warn('reCAPTCHA token error:', err);
        return '';
    }
}
