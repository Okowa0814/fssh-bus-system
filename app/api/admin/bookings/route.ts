import { prisma } from "@/server/db";
import { requireAdmin, isResponse } from "@/server/auth";
import { ok } from "@/server/http";

/** GET /api/admin/bookings — 登記總覽（含學生與路線班次資訊） */
export async function GET(request: Request) {
    const auth = await requireAdmin(request);
    if (isResponse(auth)) {
        return auth;
    }

    const bookings = await prisma.booking.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            student: {
                select: {
                    studentId: true,
                    name: true,
                    enrollmentYear: true,
                    email: true,
                },
            },
            route: { select: { id: true, name: true, departAt: true } },
        },
    });

    return ok(bookings);
}
