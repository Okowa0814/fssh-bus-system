import { prisma } from "@/server/db";
import { requireAdmin, isResponse } from "@/server/auth";
import { ok, fail } from "@/server/http";

/** POST /api/admin/schedules — 新增班次 */
export async function POST(request: Request) {
    const auth = await requireAdmin(request);
    if (isResponse(auth)) {
        return auth;
    }

    let body: { routeId?: unknown; label?: unknown; departAt?: unknown };
    try {
        body = await request.json();
    } catch {
        return fail(400, "請求格式錯誤");
    }

    const routeId = Number(body.routeId);
    if (!Number.isInteger(routeId)) {
        return fail(400, "路線代碼格式錯誤");
    }
    if (typeof body.label !== "string" || !body.label.trim()) {
        return fail(400, "班次名稱格式錯誤");
    }
    if (typeof body.departAt !== "string" || !body.departAt.trim()) {
        return fail(400, "發車時間格式錯誤");
    }

    const route = await prisma.route.findUnique({ where: { id: routeId } });
    if (!route) {
        return fail(404, "查無此路線");
    }

    const schedule = await prisma.schedule.create({
        data: {
            routeId,
            label: body.label.trim().slice(0, 30),
            departAt: body.departAt.trim().slice(0, 20),
        },
        select: { id: true, label: true, departAt: true, routeId: true },
    });

    return ok(schedule, 201);
}
