/**
 * Rate limiter middleware with Redis support for multi-instance deployments.
 * Falls back to in-memory when REDIS_URL is not set.
 */

import { Request, Response, NextFunction } from 'express';

// ============ IN-MEMORY STORE ============

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

function createInMemoryStore() {
    const store = new Map<string, RateLimitEntry>();

    // Cleanup expired entries every minute
    const cleanup = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of store.entries()) {
            if (now > entry.resetTime) {
                store.delete(key);
            }
        }
    }, 60 * 1000);
    cleanup.unref?.();

    return {
        async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
            const now = Date.now();
            let entry = store.get(key);

            if (!entry || now > entry.resetTime) {
                entry = { count: 0, resetTime: now + windowMs };
                store.set(key, entry);
            }

            entry.count++;
            return { count: entry.count, resetTime: entry.resetTime };
        },
    };
}

// ============ REDIS STORE ============

async function createRedisStore() {
    const { default: Redis } = await import('ioredis');
    const redis = new Redis(process.env.REDIS_URL!);

    return {
        async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
            const redisKey = `ratelimit:${key}`;
            const ttlSeconds = Math.ceil(windowMs / 1000);

            const count = await redis.incr(redisKey);
            if (count === 1) {
                await redis.expire(redisKey, ttlSeconds);
            }

            const ttl = await redis.ttl(redisKey);
            const resetTime = Date.now() + ttl * 1000;

            return { count, resetTime };
        },
    };
}

// ============ STORE INITIALIZATION ============

type RateLimitStore = { increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> };

// Singleton in-memory store for general rate limiters (no Redis ops)
const inMemoryStore = createInMemoryStore();

// Lazy singleton Redis store — only created when first needed
let redisStorePromise: Promise<RateLimitStore> | null = null;

function getRedisStore(): Promise<RateLimitStore> {
    if (redisStorePromise) return redisStorePromise;

    if (process.env.REDIS_URL) {
        redisStorePromise = createRedisStore().catch((err) => {
            console.warn('⚠️  Redis rate limiter failed, falling back to in-memory:', err);
            return createInMemoryStore();
        });
    } else {
        redisStorePromise = Promise.resolve(createInMemoryStore());
    }

    return redisStorePromise;
}

// ============ MIDDLEWARE FACTORY ============

/**
 * Create a rate limiting middleware.
 * @param windowMs - Time window in milliseconds
 * @param maxRequests - Maximum requests per window
 * @param keyFn - Optional function to extract the key (defaults to IP)
 * @param useRedis - If true, use Redis store (for cross-instance limits). Default: false (in-memory).
 */
export function rateLimit(
    windowMs: number = 60 * 1000,
    maxRequests: number = 100,
    keyFn?: (req: Request) => string,
    useRedis: boolean = false,
) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // Skip rate limiting in non-production environments
        if (process.env.NODE_ENV !== 'production') {
            next();
            return;
        }

        try {
            const store = useRedis ? await getRedisStore() : inMemoryStore;
            const key = keyFn ? keyFn(req) : (req.ip || req.socket.remoteAddress || 'unknown');
            const { count, resetTime } = await store.increment(key, windowMs);

            const remaining = Math.max(0, maxRequests - count);
            const resetSeconds = Math.ceil((resetTime - Date.now()) / 1000);

            res.set('X-RateLimit-Limit', String(maxRequests));
            res.set('X-RateLimit-Remaining', String(remaining));
            res.set('X-RateLimit-Reset', String(resetSeconds));

            if (count > maxRequests) {
                const waitMinutes = Math.ceil(resetSeconds / 60);
                const waitText = waitMinutes <= 1 ? 'about a minute' : `${waitMinutes} minutes`;
                res.status(429).json({
                    error: `You've made too many requests. Please wait ${waitText} and try again.`,
                    retryAfter: resetSeconds,
                });
                return;
            }

            next();
        } catch (err) {
            // If rate limiting fails, allow the request through (fail-open for availability)
            console.error('Rate limiter error:', err);
            next();
        }
    };
}

/**
 * Strict rate limiter for sensitive endpoints (OTP, auth)
 * 5 requests per minute per IP
 */
export const strictRateLimit = rateLimit(60 * 1000, 5);

/**
 * General API rate limiter
 * 100 requests per minute per IP
 */
export const generalRateLimit = rateLimit(60 * 1000, 100);

/**
 * Phone-specific OTP rate limiter
 * 4 OTP requests per phone number per 5 minutes
 * Uses Redis for cross-instance consistency (critical security limit)
 */
export const otpPhoneRateLimit = rateLimit(
    5 * 60 * 1000,
    4,
    (req) => `otp:${req.body?.phone || 'unknown'}`,
    true  // ← Redis-backed
);

