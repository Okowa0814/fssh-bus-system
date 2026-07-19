import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { requireAdmin, isResponse } from "@/server/auth";
import { ok, fail } from "@/server/http";
import { parseStations } from "@/server/stations";

/** PATCH /api/admin/routes/:id — 路線管理（站點切換、路線啟用/停用、名稱） */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    const auth = await requireAdmin(request);
    if (isResponse(auth)) {
        return auth;
    }

    const { id } = await context.params;
    const routeId = Number(id);
    if (!Number.isInteger(routeId)) {
        return fail(400, "路線代碼格式錯誤");
    }

    let body: { name?: unknown; enabled?: unknown; stations?: unknown };
    try {
        body = await request.json();
    } catch {
        return fail(400, "請求格式錯誤");
    }

    const data: { name?: string; enabled?: boolean; stations?: Prisma.InputJsonValue } = {};
    if (body.name !== undefined) {
        if (typeof body.name !== "string" || !body.name.trim()) {
            return fail(400, "路線名稱格式錯誤");
        }
        data.name = body.name.trim().slice(0, 50);
    }
    if (body.enabled !== undefined) {
        if (typeof body.enabled !== "boolean") {
            return fail(400, "enabled 需為布林值");
        }
        data.enabled = body.enabled;
    }
    if (body.stations !== undefined) {
        const stations = parseStations(body.stations);
        if (!stations) {
            return fail(400, "站點資料格式錯誤");
        }
        data.stations = stations as unknown as Prisma.InputJsonValue;
    }
    if (Object.keys(data).length === 0) {
        return fail(400, "沒有可更新的欄位");
    }

    const exists = await prisma.route.findUnique({ where: { id: routeId } });
    if (!exists) {
        return fail(404, "查無此路線");
    }

    const route = await prisma.route.update({ where: { id: routeId }, data });
    return ok(route);
}

/** DELETE /api/admin/routes/:id — 刪除路線（連同底下班次一併刪除） */
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    const auth = await requireAdmin(request);
    if (isResponse(auth)) {
        return auth;
    }

    const { id } = await context.params;
    const routeId = Number(id);
    if (!Number.isInteger(routeId)) {
        return fail(400, "路線代碼格式錯誤");
    }

    const exists = await prisma.route.findUnique({ where: { id: routeId } });
    if (!exists) {
        return fail(404, "查無此路線");
    }

    try {
        await prisma.route.delete({ where: { id: routeId } });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
            return fail(409, "此路線底下的班次仍有登記紀錄，請先處理相關登記後再刪除");
        }
        throw error;
    }

    return ok({ id: routeId });
}
