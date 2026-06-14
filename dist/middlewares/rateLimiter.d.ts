import type { NextFunction, Request, Response } from "express";
interface RateLimitConfig {
    /** Maximum number of requests allowed in the window. */
    maxRequests: number;
    /** Window duration in seconds. */
    windowSeconds: number;
    /** Key prefix to namespace different limiters in Redis. */
    prefix?: string;
    /** Custom message returned when the limit is exceeded. */
    message?: string;
    /**
     * Strategy to identify the client:
     *   - "ip"   → always use the IP address
     *   - "user" → use the authenticated user ID, falling back to IP
     */
    keyStrategy?: "ip" | "user";
}
/**
 * Creates an Express middleware that enforces a sliding-window rate limit
 * backed by Redis sorted sets.
 *
 * @example
 *   // 100 requests per 15 minutes, keyed by user (or IP for anon)
 *   router.use(rateLimit({ maxRequests: 100, windowSeconds: 900 }));
 *
 *   // Strict auth limiter — 5 attempts per 60 seconds, keyed by IP
 *   router.use(rateLimit({ maxRequests: 5, windowSeconds: 60, keyStrategy: "ip", prefix: "rl:auth" }));
 */
export declare function rateLimit(config: RateLimitConfig): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/** General API endpoints — generous limit. */
export declare const standardLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/** Auth-related endpoints — strict to prevent brute-force. */
export declare const authLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/** Expensive / write endpoints (creating reviews, connecting repos). */
export declare const writeLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/** Webhook ingress — higher ceiling but still bounded. */
export declare const webhookLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export {};
//# sourceMappingURL=rateLimiter.d.ts.map