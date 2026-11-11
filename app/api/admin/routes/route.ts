import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/server/db";
import { requireAdmin, isResponse } from "@/server/auth";
import { ok, fail } from "@/server/http";
import { parseStations } from "@/server/stations";
import { isRouteFull } from "@/server/booking";

/** GET /api/admin/routes — 全部路線 */
export async function GET(request: Request) {
    const auth = await requireAdmin(request);
    if (isResponse(auth)) {
        return auth;
    }

    const routes = await prisma.route.findMany({
        orderBy: { id: "asc" },
        include: { _count: { select: { bookings: true } } },
    });

    return ok(
        routes.map(({ _count, ...route }) => ({
            ...route,
            isFull: isRouteFull(_count.bookings),
        })),
    );
}

/** POST /api/admin/routes — 新增路線 */
export async function POST(request: Request) {
    const auth = await requireAdmin(request);
    if (isResponse(auth)) {
        return auth;
    }

    let body: { name?: unknown; stations?: unknown };
    try {
        body = await request.json();
    } catch {
        return fail(400, "請求格式錯誤");
    }

    if (typeof body.name !== "string" || !body.name.trim()) {
        return fail(400, "路線名稱格式錯誤");
    }

    const stations = body.stations === undefined ? [] : parseStations(body.stations);
    if (!stations) {
        return fail(400, "站點資料格式錯誤");
    }

    const route = await prisma.route.create({
        data: {
            name: body.name.trim().slice(0, 50),
            stations: stations as unknown as Prisma.InputJsonValue,
        },
    });

    // 新路線尚無任何登記，必定未滿
    return ok({ ...route, isFull: false }, 201);
}
