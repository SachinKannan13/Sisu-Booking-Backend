import rateLimit from 'express-rate-limit';

/**
 * AI rate limiter — 30 requests/hour per user (keyed by Authorization header).
 * Apply only to routes that actually call the AI (ask, complete, design, review).
 * Do NOT apply at router level — that would count every GET against the quota.
 */
export const aiLimiter = rateLimit({
  windowMs:      60 * 60 * 1000,
  max:           30,
  keyGenerator:  (req) => req.headers.authorization || req.ip,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'AI request limit reached (30/hour). Please wait before trying again.' }
});
