import { prisma } from "@/server/db";
import { requireAdmin, isResponse } from "@/server/auth";
import { ok, fail } from "@/server/http";
import { lockRoute } from "@/server/lock";
import { cancelBookingAndPromote } from "@/server/booking";

/** DELETE /api/admin/bookings/:id — 管理員刪除任一學生的登記，不受登記時間限制 */
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

    await prisma.$transaction(async (tx) => {
        await lockRoute(tx, booking.routeId);
        await cancelBookingAndPromote(tx, booking);
    });
    return ok({ id: booking.id });
}

/** PATCH /api/admin/bookings/:id — 管理員切換該筆登記的繳費狀態 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    const auth = await requireAdmin(request);
    if (isResponse(auth)) {
        return auth;
    }

    const { id } = await context.params;
    const bookingId = Number(id);
    if (!Number.isInteger(bookingId)) {
        return fail(400, "登記序號格式錯誤");
    }

    let body: { isPaid?: unknown };
    try {
        body = await request.json();
    } catch {
        return fail(400, "請求格式錯誤");
    }
    if (typeof body.isPaid !== "boolean") {
        return fail(400, "isPaid 需為布林值");
    }

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
        return fail(404, "Not Found");
    }

    const updated = await prisma.booking.update({
        where: { id: bookingId },
        data: { isPaid: body.isPaid },
    });

    return ok({ id: updated.id, isPaid: updated.isPaid });
}
