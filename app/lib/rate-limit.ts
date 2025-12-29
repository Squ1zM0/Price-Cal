/**
 * Simple in-memory rate limiter to prevent brute force attacks
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (entry.resetAt < now) {
      rateLimitMap.delete(key);
    }
  }
}, 10 * 60 * 1000);

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

export const rateLimit = {
  /**
   * Check if a request should be rate limited
   * @param key - Unique identifier for the request (e.g., IP address)
   * @param config - Rate limit configuration
   * @returns true if rate limit exceeded, false otherwise
   */
  isLimited(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(key);

    if (!entry || entry.resetAt < now) {
      // New entry or expired, reset
      rateLimitMap.set(key, {
        count: 1,
        resetAt: now + config.windowMs,
      });
      return false;
    }

    if (entry.count >= config.maxAttempts) {
      return true;
    }

    entry.count++;
    return false;
  },

  /**
   * Reset rate limit for a key (e.g., on successful login)
   */
  reset(key: string) {
    rateLimitMap.delete(key);
  },
};
