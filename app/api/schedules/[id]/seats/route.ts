import { prisma } from "@/server/db";
import { requireAuth, isResponse } from "@/server/auth";
import { ok, fail } from "@/server/http";
import { TOTAL_SEATS } from "@/lib/seat";

/** GET /api/schedules/:id/seats — 該班次已被登記的座位號碼 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(request);
    if (isResponse(auth)) {
        return auth;
    }

    const { id } = await context.params;
    const scheduleId = Number(id);
    if (!Number.isInteger(scheduleId)) {
        return fail(400, "班次代碼格式錯誤");
    }

    const schedule = await prisma.schedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) {
        return fail(404, "查無此班次");
    }

    const taken = await prisma.booking.findMany({
        where: { scheduleId, status: "SUCCESS" },
        select: { seatNumber: true },
    });

    return ok({
        scheduleId,
        totalSeats: TOTAL_SEATS,
        takenSeats: taken.map((booking) => booking.seatNumber),
    });
}
