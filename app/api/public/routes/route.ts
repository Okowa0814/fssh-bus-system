import { prisma } from "@/server/db";
import { ok } from "@/server/http";
import type { StationDto } from "@/lib/types";

/** GET /api/public/routes — 無需登入，供登入頁查詢路線與停靠站資訊 */
export async function GET() {
    const routes = await prisma.route.findMany({
        where: { enabled: true },
        orderBy: { id: "asc" },
    });

    return ok(
        routes.map((route) => ({
            id: route.id,
            name: route.name,
            departAt: route.departAt,
            enabled: route.enabled,
            stations: (route.stations as unknown as StationDto[]).filter(
                (station) => station.enabled,
            ),
        })),
    );
}
