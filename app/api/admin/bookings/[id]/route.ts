import { prisma } from "@/server/db";
import { requireAdmin, isResponse } from "@/server/auth";
import { ok, fail } from "@/server/http";

/** DELETE /api/admin/bookings/:id — 管理員取消任一學生的登記，不受登記時間限制 */
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    const auth = await requireAdmin(request);
    if (isResponse(auth)) {
        return auth;
    }

    const { id } = await context.params;
    const bookingId = Number(id);
    if (!Number.isInteger(bookingId)) {
        return fail(400, "登記序號格式錯誤");
    }

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
        return fail(404, "Not Found");
    }
    if (booking.status !== "SUCCESS") {
        return fail(409, "此筆登記已是取消狀態");
    }

    const updated = await prisma.booking.update({
        where: { id: bookingId },
        data: { status: "CANCELLED" },
    });

    return ok({ id: updated.id, status: updated.status });
}
