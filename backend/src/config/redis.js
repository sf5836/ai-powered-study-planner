import { createClient } from "redis";
import { env } from "./env.js";

export const redisClient = createClient({
  url: env.redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 3) {
        return false;
      }
      return Math.min(retries * 200, 1000);
    },
  },
});

redisClient.on("error", (error) => {
  console.error("Redis connection error:", error.message);
});

export async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
  return redisClient;
}

export function getRedisState() {
  return redisClient.isOpen;
}
