import { prisma } from "@/server/db";
import { requireAuth, isResponse } from "@/server/auth";
import { ok } from "@/server/http";
import type { StationDto } from "@/lib/types";

/** GET /api/routes — 學生端路線清單（僅啟用中的路線與站點） */
export async function GET(request: Request) {
    const auth = await requireAuth(request);
    if (isResponse(auth)) {
        return auth;
    }

    const routes = await prisma.route.findMany({
        where: { enabled: true },
        orderBy: { id: "asc" },
        include: {
            schedules: {
                orderBy: { id: "asc" },
                select: { id: true, label: true, departAt: true },
            },
        },
    });

    return ok(
        routes.map((route) => ({
            id: route.id,
            name: route.name,
            enabled: route.enabled,
            stations: (route.stations as unknown as StationDto[]).filter(
                (station) => station.enabled,
            ),
            schedules: route.schedules,
        })),
    );
}
