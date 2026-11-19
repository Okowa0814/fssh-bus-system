import "server-only";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// max：連線池上限。@prisma/adapter-pg 底層是 pg Pool，預設僅 10 條，
// 尖峰並行（登記／候補／遞補同時進行）下容易被佔滿。
// 壓測（1000 人同時搶位）在 25 條時出現 "Unable to start a transaction in the given time"，
// 放大到 50；PostgreSQL 預設 max_connections 為 100，需保留餘裕給備份與管理連線，不要再往上加。
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 50 });

// 開發模式熱重載時重用同一個連線池
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// transactionOptions：互動式交易（$transaction callback）的全域預設。
//   maxWait：等待取得連線的上限，預設僅 2 秒，尖峰排隊時一律逾時變 500，放寬到 15 秒讓請求排隊而不是直接失敗。
//   timeout：交易本身執行時間上限，預設 5 秒，同步放寬到 15 秒。
export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({ adapter, transactionOptions: { maxWait: 15_000, timeout: 15_000 } });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
