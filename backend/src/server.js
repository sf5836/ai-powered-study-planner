import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectMongo } from "./config/mongo.js";
import { connectRedis, redisClient } from "./config/redis.js";
import { startReportWorker } from "./jobs/queue.js";

async function bootstrap() {
  try {
    await connectMongo();
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }

  try {
    await connectRedis();
    console.log("Connected to Redis");
  } catch (error) {
    console.warn("Redis connection unavailable. Continuing without Redis features.", error.message);
  }

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`Backend server running on http://localhost:${env.port}`);
  });

  startReportWorker();

  const shutdown = async (signal) => {
    console.log(`${signal} received. Shutting down gracefully...`);

    server.close(async () => {
      try {
        if (redisClient.isOpen) {
          await redisClient.quit();
        }
      } catch {
        // Ignore shutdown errors
      }
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

bootstrap();
