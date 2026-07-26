import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/server/db";
import { requireAdmin, isResponse } from "@/server/auth";
import { ok, fail } from "@/server/http";
import { parseStations } from "@/server/stations";

/** GET /api/admin/routes — 全部路線（含停用路線與停用站點） */
export async function GET(request: Request) {
    const auth = await requireAdmin(request);
    if (isResponse(auth)) {
        return auth;
    }

    const routes = await prisma.route.findMany({
        orderBy: { id: "asc" },
    });

    return ok(routes);
}

/** POST /api/admin/routes — 新增路線 */
export async function POST(request: Request) {
    const auth = await requireAdmin(request);
    if (isResponse(auth)) {
        return auth;
    }

    let body: { name?: unknown; departAt?: unknown; stations?: unknown };
    try {
        body = await request.json();
    } catch {
        return fail(400, "請求格式錯誤");
    }

    if (typeof body.name !== "string" || !body.name.trim()) {
        return fail(400, "路線名稱格式錯誤");
    }
    if (body.departAt !== undefined && typeof body.departAt !== "string") {
        return fail(400, "發車時間格式錯誤");
    }

    const stations = body.stations === undefined ? [] : parseStations(body.stations);
    if (!stations) {
        return fail(400, "站點資料格式錯誤");
    }

    const route = await prisma.route.create({
        data: {
            name: body.name.trim().slice(0, 50),
            departAt: typeof body.departAt === "string" ? body.departAt.trim().slice(0, 20) : "",
            stations: stations as unknown as Prisma.InputJsonValue,
        },
    });

    return ok(route, 201);
}
