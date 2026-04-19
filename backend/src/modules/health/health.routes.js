import { Router } from "express";
import { checkAiService } from "../../config/aiService.js";
import { env } from "../../config/env.js";
import { getMongoState } from "../../config/mongo.js";
import { getRedisState } from "../../config/redis.js";

const router = Router();

router.get("/health", async (_req, res) => {
  let aiHealthy = false;

  try {
    await checkAiService();
    aiHealthy = true;
  } catch {
    aiHealthy = false;
  }

  res.json({
    status: "ok",
    service: "backend",
    timestamp: new Date().toISOString(),
    integrations: {
      mongo: {
        uriSet: Boolean(env.mongoUri),
        readyState: getMongoState(),
      },
      redis: {
        urlSet: Boolean(env.redisUrl),
        connected: getRedisState(),
      },
      aiService: {
        url: env.aiServiceUrl,
        healthy: aiHealthy,
      },
    },
  });
});

export default router;
