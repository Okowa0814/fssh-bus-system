import "server-only";
import { randomUUID } from "crypto";
import { redis } from "./redis";

// 只有持有相同 token 的請求才能解鎖，避免誤刪別人的鎖
const UNLOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end`;

/**
 * 取得分散式鎖（SET NX PX）。
 * 100 人同時搶同一座位時，只有第 1 個請求拿得到鎖，其餘立即得到 null。
 * @returns 鎖 token，取鎖失敗回傳 null
 */
export async function acquireLock(key: string, ttlMs: number): Promise<string | null> {
    const token = randomUUID();
    const result = await redis.set(key, token, "PX", ttlMs, "NX");
    return result === "OK" ? token : null;
}

/** 釋放鎖（無論劃位成功或失敗都必須呼叫） */
export async function releaseLock(key: string, token: string): Promise<void> {
    try {
        await redis.eval(UNLOCK_SCRIPT, 1, key, token);
    } catch {
        // 解鎖失敗時鎖仍會因 TTL 到期自動釋放，不阻斷主流程
    }
}

export function seatLockKey(scheduleId: number, seatNumber: number): string {
    return `lock:seat:${scheduleId}:${seatNumber}`;
}
