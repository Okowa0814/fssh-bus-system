import "server-only";
import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis?: Redis };

export const redis = globalForRedis.redis ??
    new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
        maxRetriesPerRequest: 2,
        enableOfflineQueue: false, // Redis 斷線時立即失敗，不讓請求無限排隊
    });

if (process.env.NODE_ENV !== "production") {
    globalForRedis.redis = redis;
}
