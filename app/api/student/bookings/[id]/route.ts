import { prisma } from "@/server/db";
import { requireStudent, isResponse } from "@/server/auth";
import { ok, fail } from "@/server/http";
import { getBookingWindow } from "@/server/settings";
import { acquireLock, releaseLock } from "@/server/lock";
import { cancelBookingAndPromote } from "@/server/booking";
import { waitlistLockKey } from "@/server/waitlist";

const LOCK_TTL_MS = 5000;

/** DELETE /api/student/bookings/:id — 取消自己的登記（僅限學生；他人的登記一律回 404 不洩漏） */
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    const auth = await requireStudent(request);
    if (isResponse(auth)) {
        return auth;
    }

    const { id } = await context.params;
    const bookingId = Number(id);
    if (!Number.isInteger(bookingId)) {
        return fail(400, "登記序號格式錯誤");
    }

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.studentId !== auth.studentId) {
        return fail(404, "Not Found");
    }

    const window = await getBookingWindow();
    if (!window.open) {
        return fail(403, "目前不在登記時間，無法取消");
    }

    // 用路線層級的候補鎖序列化取消/遞補，避免兩筆同時取消時搶到同一位候補者
    const lockKey = waitlistLockKey(booking.routeId);
    const lockToken = await acquireLock(lockKey, LOCK_TTL_MS);
    if (!lockToken) {
        return fail(423, "座位操作中，請稍後再試");
    }

    try {
        await prisma.$transaction((tx) => cancelBookingAndPromote(tx, booking));
        return ok({ id: booking.id });
    } finally {
        await releaseLock(lockKey, lockToken);
    }
}
