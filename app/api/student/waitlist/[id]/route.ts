import { prisma } from "@/server/db";
import { requireStudent, isResponse } from "@/server/auth";
import { ok, fail } from "@/server/http";
import { acquireLock, releaseLock } from "@/server/lock";
import { waitlistLockKey } from "@/server/waitlist";

const LOCK_TTL_MS = 5000;

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
    if (!entry || entry.studentId !== auth.studentId) {
        return fail(404, "Not Found");
    }

    // 與座位遞補共用同一路線的鎖，避免退出候補的當下正好被遞補
    const lockKey = waitlistLockKey(entry.routeId);
    const lockToken = await acquireLock(lockKey, LOCK_TTL_MS);
    if (!lockToken) {
        return fail(423, "候補名單操作中，請稍後再試");
    }

    try {
        const stillWaiting = await prisma.waitlistEntry.findUnique({ where: { id: entryId } });
        if (!stillWaiting) {
            return fail(409, "此候補已被遞補處理，請重新整理頁面");
        }
        await prisma.waitlistEntry.delete({ where: { id: entryId } });
        return ok({ id: entryId });
    } finally {
        await releaseLock(lockKey, lockToken);
    }
}
