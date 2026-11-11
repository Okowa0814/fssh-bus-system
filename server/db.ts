import "server-only";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// max：連線池上限。@prisma/adapter-pg 底層是 pg Pool，預設僅 10 條，
// 尖峰並行（登記／候補／遞補同時進行）下容易被佔滿，放大到 25 以提高吞吐。
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 25 });

// 開發模式熱重載時重用同一個連線池
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
