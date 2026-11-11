import { prisma } from "@/server/db";
import { ok } from "@/server/http";
import { isRouteFull } from "@/server/booking";
import type { StationDto } from "@/lib/types";

/** GET /api/public/routes — 無需登入，供登入頁查詢路線與停靠站資訊 */
export async function GET() {
    const routes = await prisma.route.findMany({
        orderBy: { id: "asc" },
        include: { _count: { select: { bookings: true } } },
    });

    return ok(
        routes.map((route) => ({
            id: route.id,
            name: route.name,
            stations: route.stations as unknown as StationDto[],
            isFull: isRouteFull(route._count.bookings),
        })),
    );
}