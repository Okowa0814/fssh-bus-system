import { prisma } from "@/server/db";
import { requireAdmin, isResponse } from "@/server/auth";
import { ok } from "@/server/http";

/** GET /api/admin/waitlist — 候補名單總覽 */
export async function GET(request: Request) {
    const auth = await requireAdmin(request);
    if (isResponse(auth)) {
        return auth;
    }

    const entries = await prisma.waitlistEntry.findMany({
        orderBy: { createdAt: "asc" },
        include: {
            student: {
                select: { studentId: true, name: true, enrollmentYear: true, email: true },
            },
            route: { select: { id: true, name: true, stations: true } },
        },
    });

    return ok(entries);
}
