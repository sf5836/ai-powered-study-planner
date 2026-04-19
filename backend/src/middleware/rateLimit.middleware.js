export function rateLimitMiddleware(_req, _res, next) {
  // Phase 2+: implement rate limiting backed by Redis.
  next();
}
