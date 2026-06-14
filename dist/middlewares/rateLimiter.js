import { rd } from "../db/redis.js";
// ─── Lua script ──────────────────────────────────────────────────────────────
// Atomic sliding-window counter using a sorted set.
//   KEYS[1] = the rate-limit key
//   ARGV[1] = current timestamp in ms
//   ARGV[2] = window start timestamp in ms
//   ARGV[3] = window duration in ms (used as TTL)
//   ARGV[4] = max requests
//
// Returns: [currentCount, 0|1 (allowed)]
const SLIDING_WINDOW_LUA = `
local key       = KEYS[1]
local now       = tonumber(ARGV[1])
local winStart  = tonumber(ARGV[2])
local windowMs  = tonumber(ARGV[3])
local maxReq    = tonumber(ARGV[4])

-- Remove entries outside the current window
redis.call('ZREMRANGEBYSCORE', key, '-inf', winStart)

-- Count remaining entries in the window
local count = redis.call('ZCARD', key)

if count < maxReq then
    -- Add the current request (score = timestamp, member = unique)
    redis.call('ZADD', key, now, now .. '-' .. math.random(1, 1000000))
    redis.call('PEXPIRE', key, windowMs)
    return {count + 1, 1}
else
    -- Still refresh TTL so the window doesn't stick around forever
    redis.call('PEXPIRE', key, windowMs)
    return {count, 0}
end
`;
// ─── Middleware factory ──────────────────────────────────────────────────────
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
export function rateLimit(config) {
    const { maxRequests, windowSeconds, prefix = "rl:global", message = "Too many requests — please try again later.", keyStrategy = "user", } = config;
    const windowMs = windowSeconds * 1000;
    return async (req, res, next) => {
        try {
            const identifier = resolveKey(req, keyStrategy);
            const redisKey = `${prefix}:${identifier}`;
            const now = Date.now();
            const windowStart = now - windowMs;
            const result = (await rd.eval(SLIDING_WINDOW_LUA, 1, redisKey, now.toString(), windowStart.toString(), windowMs.toString(), maxRequests.toString()));
            const [currentCount, allowed] = result;
            const remaining = Math.max(0, maxRequests - currentCount);
            // Standard rate-limit headers (draft-ietf-httpapi-ratelimit-headers)
            res.setHeader("RateLimit-Limit", maxRequests);
            res.setHeader("RateLimit-Remaining", remaining);
            res.setHeader("RateLimit-Reset", Math.ceil(windowSeconds - (now % windowMs) / 1000));
            if (!allowed) {
                const retryAfter = Math.ceil(windowSeconds);
                res.setHeader("Retry-After", retryAfter);
                res.status(429).json({ message });
                return;
            }
            next();
        }
        catch (error) {
            // If Redis is unavailable, fail open so the app stays usable
            // but log the error for observability.
            console.error("[RateLimiter] Redis error — failing open:", error);
            next();
        }
    };
}
// ─── Helpers ─────────────────────────────────────────────────────────────────
function resolveKey(req, strategy) {
    if (strategy === "user" && req.user?.id) {
        return `user:${req.user.id}`;
    }
    // Express 5 populates req.ip; fall back to remote address
    return `ip:${req.ip ?? req.socket.remoteAddress ?? "unknown"}`;
}
// ─── Pre-built tier presets ──────────────────────────────────────────────────
/** General API endpoints — generous limit. */
export const standardLimiter = rateLimit({
    maxRequests: 100,
    windowSeconds: 15 * 60, // 15 min
    prefix: "rl:standard",
});
/** Auth-related endpoints — strict to prevent brute-force. */
export const authLimiter = rateLimit({
    maxRequests: 10,
    windowSeconds: 15 * 60,
    prefix: "rl:auth",
    keyStrategy: "ip",
    message: "Too many authentication attempts — please try again in 15 minutes.",
});
/** Expensive / write endpoints (creating reviews, connecting repos). */
export const writeLimiter = rateLimit({
    maxRequests: 20,
    windowSeconds: 15 * 60,
    prefix: "rl:write",
    message: "Too many write requests — please slow down.",
});
/** Webhook ingress — higher ceiling but still bounded. */
export const webhookLimiter = rateLimit({
    maxRequests: 200,
    windowSeconds: 15 * 60,
    prefix: "rl:webhook",
    keyStrategy: "ip",
    message: "Webhook rate limit exceeded.",
});
//# sourceMappingURL=rateLimiter.js.map