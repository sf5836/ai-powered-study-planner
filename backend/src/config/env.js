import "dotenv/config";

function required(name, fallback = "") {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  mongoUri: required("MONGODB_URI", "mongodb://localhost:27017/studyplanner"),
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  aiServiceUrl: process.env.AI_SERVICE_URL || "http://localhost:8000",
  aiRequestTimeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS || 1500),
  aiRequestRetries: Number(process.env.AI_REQUEST_RETRIES || 1),
  aiCircuitFailureThreshold: Number(process.env.AI_CIRCUIT_FAILURE_THRESHOLD || 3),
  aiCircuitOpenMs: Number(process.env.AI_CIRCUIT_OPEN_MS || 30000),
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS || 60),
  apiTargetP95Ms: Number(process.env.API_TARGET_P95_MS || 300),
  errorBudgetPercent: Number(process.env.ERROR_BUDGET_PERCENT || 1),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  jwtAccessSecret: required("JWT_ACCESS_SECRET", process.env.JWT_SECRET || "focusiq-local-access-secret"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET", "focusiq-local-refresh-secret"),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || process.env.JWT_TTL || "15m",
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || "7d",
};
