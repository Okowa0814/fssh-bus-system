import { prisma } from "@/server/db";
import { requireStudent, isResponse } from "@/server/auth";
import { ok, fail, ApiFailure } from "@/server/http";
import { lockRoute } from "@/server/lock";

/** DELETE /api/student/waitlist/:id — 自行退出候補名單（僅限學生；他人的候補一律回 404 不洩漏） */
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    const auth = await requireStudent(request);
    if (isResponse(auth)) {
        return auth;
    }

    const { id } = await context.params;
    const entryId = Number(id);
    if (!Number.isInteger(entryId)) {
        return fail(400, "候補序號格式錯誤");
    }

    const entry = await prisma.waitlistEntry.findUnique({ where: { id: entryId } });
    if (
        !entry ||
        entry.enrollmentYear !== auth.enrollmentYear ||
        entry.studentId !== auth.studentId
    ) {
        return fail(404, "Not Found");
    }

    // 與座位遞補共用同一路線的 advisory 鎖，避免退出候補的當下正好被遞補
    try {
        await prisma.$transaction(async (tx) => {
            await lockRoute(tx, entry.routeId);
            const stillWaiting = await tx.waitlistEntry.findUnique({ where: { id: entryId } });
            if (!stillWaiting) {
                throw new ApiFailure(409, "此候補已被遞補處理，請重新整理頁面");
            }
            await tx.waitlistEntry.delete({ where: { id: entryId } });
        });
        return ok({ id: entryId });
    } catch (error) {
        if (error instanceof ApiFailure) {
            return fail(error.status, error.message);
        }
        throw error;
    }
}
