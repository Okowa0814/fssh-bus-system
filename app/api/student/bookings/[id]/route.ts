import { prisma } from "@/server/db";
import { requireStudent, isResponse } from "@/server/auth";
import { ok, fail } from "@/server/http";
import { getBookingWindow } from "@/server/settings";

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
    if (booking.status !== "SUCCESS") {
        return fail(409, "此筆登記已是取消狀態");
    }

    const window = await getBookingWindow();
    if (!window.open) {
        return fail(403, "目前不在登記時間，無法取消");
    }

    const updated = await prisma.booking.update({
        where: { id: bookingId },
        data: { status: "CANCELLED" },
    });

    return ok({ id: updated.id, status: updated.status });
}
