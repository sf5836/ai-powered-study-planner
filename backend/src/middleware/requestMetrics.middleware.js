import { env } from "../config/env.js";
import { logInfo } from "../config/logger.js";

const metrics = {
  totalRequests: 0,
  errorRequests: 0,
  durations: [],
  byRoute: new Map(),
};

function percentile(values, fraction) {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.floor((sorted.length - 1) * fraction);
  return sorted[index];
}

export function requestMetricsMiddleware(req, res, next) {
  const startedAt = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    const status = res.statusCode;
    const routeKey = `${req.method} ${req.baseUrl || ""}${req.route?.path || req.path}`;

    metrics.totalRequests += 1;
    if (status >= 500) {
      metrics.errorRequests += 1;
    }

    metrics.durations.push(durationMs);
    if (metrics.durations.length > 2000) {
      metrics.durations.shift();
    }

    const routeBucket = metrics.byRoute.get(routeKey) || { count: 0, durations: [] };
    routeBucket.count += 1;
    routeBucket.durations.push(durationMs);
    if (routeBucket.durations.length > 500) {
      routeBucket.durations.shift();
    }
    metrics.byRoute.set(routeKey, routeBucket);

    logInfo("http_request", {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      status,
      durationMs,
    });
  });

  next();
}

export function getRequestMetricsSnapshot() {
  const p95 = percentile(metrics.durations, 0.95);
  const p50 = percentile(metrics.durations, 0.5);
  const errorRatePercent = metrics.totalRequests === 0 ? 0 : (metrics.errorRequests / metrics.totalRequests) * 100;

  const routes = Array.from(metrics.byRoute.entries()).map(([route, data]) => ({
    route,
    count: data.count,
    p95Ms: percentile(data.durations, 0.95),
  }));

  return {
    totals: {
      totalRequests: metrics.totalRequests,
      errorRequests: metrics.errorRequests,
      errorRatePercent: Number(errorRatePercent.toFixed(2)),
    },
    latency: {
      p50Ms: p50,
      p95Ms: p95,
      targetP95Ms: env.apiTargetP95Ms,
      withinTarget: p95 === null ? true : p95 <= env.apiTargetP95Ms,
    },
    errorBudget: {
      targetPercent: env.errorBudgetPercent,
      remainingPercent: Number(Math.max(0, env.errorBudgetPercent - errorRatePercent).toFixed(2)),
      exhausted: errorRatePercent > env.errorBudgetPercent,
    },
    routes,
  };
}
