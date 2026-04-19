import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { rateLimitMiddleware } from "./middleware/rateLimit.middleware.js";
import { requestMetricsMiddleware } from "./middleware/requestMetrics.middleware.js";
import { requestIdMiddleware } from "./middleware/requestId.middleware.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import aiRoutes from "./modules/ai/ai.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import healthRoutes from "./modules/health/health.routes.js";
import notificationsRoutes from "./modules/notifications/notifications.routes.js";
import observabilityRoutes from "./modules/observability/observability.routes.js";
import plannerRoutes from "./modules/planner/planner.routes.js";
import reportsRoutes from "./modules/reports/reports.routes.js";
import sessionsRoutes from "./modules/sessions/sessions.routes.js";
import subjectsRoutes from "./modules/subjects/subjects.routes.js";
import topicsRoutes from "./modules/topics/topics.routes.js";
import usersRoutes from "./modules/users/users.routes.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.corsOrigin,
    })
  );
  app.use(requestIdMiddleware);
  app.use(requestMetricsMiddleware);
  app.use(rateLimitMiddleware);
  app.use(express.json({ limit: "1mb" }));

  app.use("/", healthRoutes);
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/ai", aiRoutes);
  app.use("/api/v1/users", usersRoutes);
  app.use("/api/v1/subjects", subjectsRoutes);
  app.use("/api/v1/topics", topicsRoutes);
  app.use("/api/v1/planner", plannerRoutes);
  app.use("/api/v1/sessions", sessionsRoutes);
  app.use("/api/v1/reports", reportsRoutes);
  app.use("/api/v1/notifications", notificationsRoutes);
  app.use("/api/v1/observability", observabilityRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
