import { prisma } from "@/server/db";
import { requireAdmin, isResponse } from "@/server/auth";
import { ok, fail } from "@/server/http";

/** PATCH /api/admin/user/:id — 管理員修改使用者姓名（:id 為學號） */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    const auth = await requireAdmin(request);
    if (isResponse(auth)) {
        return auth;
    }

    const { id: studentId } = await context.params;

    let body: { name?: unknown };
    try {
        body = await request.json();
    } catch {
        return fail(400, "請求格式錯誤");
    }
    if (typeof body.name !== "string" || !body.name.trim()) {
        return fail(400, "姓名格式錯誤");
    }

    const exists = await prisma.user.findUnique({ where: { studentId } });
    if (!exists) {
        return fail(404, "查無此使用者");
    }

    const updated = await prisma.user.update({
        where: { studentId },
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
