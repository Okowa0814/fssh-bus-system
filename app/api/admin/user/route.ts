import { prisma } from "@/server/db";
import { requireAdmin, isResponse } from "@/server/auth";
import { ok } from "@/server/http";

/** GET /api/admin/user — 全部使用者 */
export async function GET(request: Request) {
    const auth = await requireAdmin(request);
    if (isResponse(auth)) {
        return auth;
    }

    const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            studentId: true,
            name: true,
            email: true,
            enrollmentYear: true,
            isAdmin: true,
            createdAt: true,
        },
    });

    return ok(users);
}
