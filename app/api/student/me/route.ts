import { prisma } from "@/server/db";
import { requireStudent, isResponse } from "@/server/auth";
import { ok, fail } from "@/server/http";

/** GET /api/student/me — 目前登入者的資料與有效登記（身份頁 / 主頁使用，僅限學生） */
export async function GET(request: Request) {
    const auth = await requireStudent(request);
    if (isResponse(auth)) {
        return auth;
    }

    const user = await prisma.user.findUnique({
        where: { studentId: auth.studentId },
        select: {
            studentId: true,
            name: true,
            email: true,
            enrollmentYear: true,
            isAdmin: true,
        },
    });
    if (!user) {
        return fail(401, "帳號不存在，請重新登入");
    }

    const booking = await prisma.booking.findFirst({
        where: { studentId: auth.studentId, status: "SUCCESS" },
        include: {
            route: { select: { id: true, name: true, stations: true } },
        },
    });

    return ok({ user, booking });
}
