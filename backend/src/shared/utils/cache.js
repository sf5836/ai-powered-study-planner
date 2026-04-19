import { env } from "../../config/env.js";
import { redisClient } from "../../config/redis.js";

const memoryCache = new Map();

function nowMs() {
  return Date.now();
}

function memoryGet(key) {
  const entry = memoryCache.get(key);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= nowMs()) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

function memorySet(key, value, ttlSeconds) {
  memoryCache.set(key, {
    value,
    expiresAt: nowMs() + ttlSeconds * 1000,
  });
}

export async function cacheGetJson(key) {
  if (redisClient.isOpen) {
    const raw = await redisClient.get(key);
    return raw ? JSON.parse(raw) : null;
  }

  return memoryGet(key);
}

export async function cacheSetJson(key, value, ttlSeconds = env.cacheTtlSeconds) {
  if (redisClient.isOpen) {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
    return;
  }

  memorySet(key, value, ttlSeconds);
}

export async function cacheDelete(key) {
  if (redisClient.isOpen) {
    await redisClient.del(key);
    return;
  }

  memoryCache.delete(key);
}
