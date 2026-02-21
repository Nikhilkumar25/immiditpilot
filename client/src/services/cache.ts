/**
 * Simple cache utility for API responses
 * Caches GET requests for a configurable TTL (default: 30 seconds)
 */

interface CacheEntry {
    data: any;
    timestamp: number;
    ttl: number;
}

class ApiCache {
    private cache = new Map<string, CacheEntry>();
    private readonly DEFAULT_TTL = 30000; // 30 seconds in milliseconds

    /**
     * Get cached data if valid
     */
    get(key: string): any | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        const now = Date.now();
        if (now - entry.timestamp > entry.ttl) {
            // Cache expired, remove it
            this.cache.delete(key);
            return null;
        }

        return entry.data;
    }

    /**
     * Set cache data
     */
    set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl,
        });
    }

    /**
     * Clear cache for a specific key
     */
    invalidate(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Clear cache for keys matching a pattern
     */
    invalidatePattern(pattern: string | RegExp): void {
        const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
        const keysToDelete: string[] = [];

        this.cache.forEach((_, key) => {
            if (regex.test(key)) {
                keysToDelete.push(key);
            }
        });

        keysToDelete.forEach(key => this.cache.delete(key));
    }

    /**
     * Clear all cache
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Generate cache key from URL
     */
    generateKey(url: string): string {
        return `api-cache:${url}`;
    }
}

export const apiCache = new ApiCache();
