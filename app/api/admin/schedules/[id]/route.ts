import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { requireAdmin, isResponse } from "@/server/auth";
import { ok, fail } from "@/server/http";

/** DELETE /api/admin/schedules/:id — 刪除班次 */
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    const auth = await requireAdmin(request);
    if (isResponse(auth)) {
        return auth;
    }

    const { id } = await context.params;
    const scheduleId = Number(id);
    if (!Number.isInteger(scheduleId)) {
        return fail(400, "班次代碼格式錯誤");
    }

    const exists = await prisma.schedule.findUnique({ where: { id: scheduleId } });
    if (!exists) {
        return fail(404, "查無此班次");
    }

    try {
        await prisma.schedule.delete({ where: { id: scheduleId } });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
            return fail(409, "此班次仍有登記紀錄，請先處理相關登記後再刪除");
        }
        throw error;
    }

    return ok({ id: scheduleId });
}
