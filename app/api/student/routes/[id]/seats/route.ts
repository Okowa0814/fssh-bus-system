import { prisma } from "@/server/db";
import { requireStudent, isResponse } from "@/server/auth";
import { ok, fail } from "@/server/http";
import { TOTAL_SEATS } from "@/lib/seat";

/** GET /api/student/routes/:id/seats — 該路線已被登記的座位號碼（僅限學生） */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const auth = await requireStudent(request);
    if (isResponse(auth)) {
        return auth;
    }

    const { id } = await context.params;
    const routeId = Number(id);
    if (!Number.isInteger(routeId)) {
        return fail(400, "路線代碼格式錯誤");
    }

    const route = await prisma.route.findUnique({ where: { id: routeId } });
    if (!route) {
        return fail(404, "查無此路線");
    }

    const taken = await prisma.booking.findMany({
        where: { routeId, status: "SUCCESS" },
        select: { seatNumber: true },
    });

    return ok({
        routeId,
        totalSeats: TOTAL_SEATS,
        takenSeats: taken.map((booking) => booking.seatNumber),
    });
}
