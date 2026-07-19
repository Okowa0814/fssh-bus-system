import "server-only";
import { PrismaClient } from "@prisma/client";

// 開發模式熱重載時重用同一個連線池
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
