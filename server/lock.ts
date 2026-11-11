import "server-only";
import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * 路線層級的交易內 advisory 鎖（PostgreSQL pg_advisory_xact_lock）。
 *
 * 用途：序列化「同一路線」會互相影響的低頻寫入——取消登記並遞補、退出候補——
 * 確保一個釋出的座位只會被一位候補者遞補、且不會與「候補者自行退出」互撞。
 *
 * 特性：
 *   - 交易內鎖，交易 commit / rollback 時由資料庫「自動釋放」，不需手動解鎖、沒有 TTL、不會洩漏。
 *   - 必須在 prisma.$transaction 的 callback「最前面」呼叫，與交易共用同一條連線才有效。
 *
 * 注意：登記選位與候補加入屬於高頻「驚群」路徑，刻意「不」使用本鎖——
 * 它們的正確性由 DB 唯一約束（@@unique([routeId, seatNumber]) / @@unique([enrollmentYear, studentId])）保證，
 * 無鎖並行才不會在尖峰把連線池佔滿。
 */
export async function lockRoute(tx: Prisma.TransactionClient, routeId: number): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${routeId})`;
}
