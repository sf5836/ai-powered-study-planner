export function requestIdMiddleware(req, _res, next) {
  req.requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  next();
}
