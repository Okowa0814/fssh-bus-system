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
 * 100 人同時搶同一把鎖時，只有第 1 個請求拿得到鎖，其餘立即得到 null。
 * @returns 鎖 token，取鎖失敗回傳 null
 */
export async function acquireLock(key: string, ttlMs: number): Promise<string | null> {
    const token = randomUUID();
    const result = await redis.set(key, token, "PX", ttlMs, "NX");
    return result === "OK" ? token : null;
}

/** 取鎖時若 Redis 短暫斷線則重試一次；仍失敗就把例外往外拋，交由呼叫端轉成 503 */
export async function acquireLockResilient(key: string, ttlMs: number): Promise<string | null> {
    try {
        return await acquireLock(key, ttlMs);
    } catch {
        await new Promise((resolve) => setTimeout(resolve, 80));
        return await acquireLock(key, ttlMs);
    }
}

/** 釋放鎖（無論劃位成功或失敗都必須呼叫） */
export async function releaseLock(key: string, token: string): Promise<void> {
    try {
        await redis.eval(UNLOCK_SCRIPT, 1, key, token);
    } catch {
        // 解鎖失敗時鎖仍會因 TTL 到期自動釋放，不阻斷主流程
    }
}

/**
 * 路線層級的鎖：序列化同一路線的所有登記寫入（新增登記／取消登記／候補加入／候補退出）。
 * 沒有這把鎖時，同路線不同座位的建立交易會平行執行，座位計數（isFull 判斷）在
 * PostgreSQL READ COMMITTED 隔離層級下看不到彼此尚未 commit 的 insert，
 * 可能導致座位已滿 42/42 但 isFull 誤判為 false；取消登記時若候補名單為空，
 * cancelBookingAndPromote 也會把 isFull 重設回 false，避免永久卡死空位。
 */
export function routeLockKey(routeId: number): string {
    return `lock:route:${routeId}`;
}

/**
 * 學生層級的鎖：序列化同一學生的登記／候補寫入，是第一道防線。
 * key 必須同時帶入學年與學號——不同屆但號碼剛好相同的兩個學生是資料庫裡不同的人，
 * 只用學號當 key 會讓他們錯誤共用同一把鎖。
 * 第二道防線是交易內的 SELECT 檢查，第三道是 Booking/WaitlistEntry 的
 * @@unique([enrollmentYear, studentId]) DB 約束——若前兩道防線因 Redis 失效或極端併發而失守，
 * 最終仍會在 DB 層擋下同一學生的第二筆登記／候補（P2002），不會造成一人多位。
 */
export function studentLockKey(enrollmentYear: string, studentId: string): string {
    return `lock:student:${enrollmentYear}:${studentId}`;
}
