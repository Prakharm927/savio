import { Request, Response, NextFunction } from 'express';
import redis from '../config/redis';
import logger from '../utils/logger';

interface RateLimiterOptions {
    windowMs: number;
    max: number;
    message: string;
    keyPrefix: string;
    keyGenerator?: (req: Request) => string;
    skip?: (req: Request) => boolean;
}

// Custom Redis-based rate limiter (no external dependencies)
class RedisRateLimiter {
    private options: RateLimiterOptions;

    constructor(options: RateLimiterOptions) {
        this.options = options;
    }

    async checkLimit(key: string): Promise<{ allowed: boolean; current: number; remaining: number }> {
        const fullKey = `${this.options.keyPrefix}${key}`;
        const now = Date.now();
        const windowStart = now - this.options.windowMs;

        try {
            // Remove old entries outside the window
            await redis.zremrangebyscore(fullKey, 0, windowStart);

            // Count requests in current window
            const current = await redis.zcard(fullKey);

            if (current >= this.options.max) {
                return {
                    allowed: false,
                    current,
                    remaining: 0,
                };
            }

            // Add current request
            await redis.zadd(fullKey, now, `${now}-${Math.random()}`);

            // Set expiry on key
            await redis.expire(fullKey, Math.ceil(this.options.windowMs / 1000));

            return {
                allowed: true,
                current: current + 1,
                remaining: this.options.max - current - 1,
            };
        } catch (error) {
            logger.error('Rate limiter error:', error);
            // On error, allow the request (graceful degradation)
            return { allowed: true, current: 0, remaining: this.options.max };
        }
    }

    middleware() {
        return async (req: Request, res: Response, next: NextFunction) => {
            // Skip if configured
            if (this.options.skip && this.options.skip(req)) {
                return next();
            }

            // Get key (IP or custom)
            const key = this.options.keyGenerator
                ? this.options.keyGenerator(req)
                : (req.headers['x-forwarded-for'] as string || req.ip || 'unknown');

            const result = await this.checkLimit(key);

            // Set rate limit headers
            res.setHeader('X-RateLimit-Limit', this.options.max);
            res.setHeader('X-RateLimit-Remaining', result.remaining);
            res.setHeader('X-RateLimit-Reset', Date.now() + this.options.windowMs);

            if (!result.allowed) {
                logger.warn(`Rate limit exceeded for key: ${key}`);
                return res.status(429).json({
                    success: false,
                    error: this.options.message,
                    retryAfter: Math.ceil(this.options.windowMs / 1000),
                });
            }

            next();
        };
    }
}

// Global rate limiter (10,000 requests per minute)
export const globalLimiter = new RedisRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 10_000,
    message: 'Too many requests from this server. Please try again later.',
    keyPrefix: 'rl:global:',
    keyGenerator: () => 'global', // Same key for all requests
}).middleware();

// Per-IP rate limiter (100 requests per 15 minutes)
export const perIpLimiter = new RedisRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests from your IP. Please try again in 15 minutes.',
    keyPrefix: 'rl:ip:',
}).middleware();

// Comparison rate limiter (20 requests per minute)
export const comparisonLimiter = new RedisRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    message: 'You are comparing prices too frequently. Please wait a minute.',
    keyPrefix: 'rl:comparison:',
}).middleware();

// Authenticated user rate limiter (500 requests per 15 minutes)
export const authenticatedUserLimiter = new RedisRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: 'Too many requests. Please try again in 15 minutes.',
    keyPrefix: 'rl:user:',
    keyGenerator: (req: Request) => {
        const userId = (req as any).user?.id || req.ip;
        return userId;
    },
    skip: (req: Request) => !(req as any).user,
}).middleware();

// Graceful degradation: if Redis is down, allow requests
export const rateLimiterErrorHandler = (
    err: Error,
    _req: Request,
    _res: Response,
    next: NextFunction
) => {
    logger.error('Rate limiter error:', err);
    next();
};
