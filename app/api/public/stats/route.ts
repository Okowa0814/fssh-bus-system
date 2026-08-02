import { prisma } from "@/server/db";
import { ok } from "@/server/http";
import { TOTAL_SEATS } from "@/lib/seat";

/** GET /api/public/stats — 無需登入，供登入頁顯示目前路線與座位概況 */
export async function GET() {
    const routeCount = await prisma.route.count({ where: { enabled: true } });

    return ok({ routeCount, totalSeats: routeCount * TOTAL_SEATS });
}
