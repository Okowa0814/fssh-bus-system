import { prisma } from "@/server/db";
import { requireAdmin, isResponse } from "@/server/auth";
import { ok, fail } from "@/server/http";

/** PATCH /api/admin/user/:year/:id — 管理員修改使用者姓名（:year 為入學年，:id 為學號） */
export async function PATCH(
    request: Request,
    context: { params: Promise<{ year: string; id: string }> },
) {
    const auth = await requireAdmin(request);
    if (isResponse(auth)) {
        return auth;
    }

    const { year: enrollmentYear, id: studentId } = await context.params;

    let body: { name?: unknown };
    try {
        body = await request.json();
    } catch {
        return fail(400, "請求格式錯誤");
    }
    if (typeof body.name !== "string" || !body.name.trim()) {
        return fail(400, "姓名格式錯誤");
    }

    const where = { enrollmentYear_studentId: { enrollmentYear, studentId } };

    const exists = await prisma.user.findUnique({ where });
    if (!exists) {
        return fail(404, "查無此使用者");
    }

    const updated = await prisma.user.update({
        where,
        data: { name: body.name.trim().slice(0, 50) },
        select: {
            studentId: true,
            name: true,
            email: true,
            enrollmentYear: true,
            isAdmin: true,
            createdAt: true,
        },
    });

    return ok(updated);
}
