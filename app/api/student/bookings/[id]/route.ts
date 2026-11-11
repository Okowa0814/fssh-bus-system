import { prisma } from "@/server/db";
import { requireStudent, isResponse } from "@/server/auth";
import { ok, fail } from "@/server/http";
import { getBookingWindow } from "@/server/settings";
import { lockRoute } from "@/server/lock";
import { cancelBookingAndPromote } from "@/server/booking";

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
    if (
        !booking ||
        booking.enrollmentYear !== auth.enrollmentYear ||
        booking.studentId !== auth.studentId
    ) {
        return fail(404, "Not Found");
    }

    const window = await getBookingWindow();
    if (!window.open) {
        return fail(403, "目前不在登記時間，無法取消");
    }

    // 交易內取得路線 advisory 鎖，序列化同路線的取消/遞補，避免兩筆同時取消搶到同一位候補者
    await prisma.$transaction(async (tx) => {
        await lockRoute(tx, booking.routeId);
        await cancelBookingAndPromote(tx, booking);
    });
    return ok({ id: booking.id });
}
