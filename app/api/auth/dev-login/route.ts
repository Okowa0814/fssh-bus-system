import { prisma } from "@/server/db";
import { signToken } from "@/server/auth";
import { ok, fail } from "@/server/http";

/**
 * 開發用假登入：略過 Google OAuth，直接對假帳號簽發合法 JWT
 * 僅限非 production 環境使用，正式環境直接 404（與 requireAdmin 的隱藏策略一致）
 */
export async function GET(request: Request) {
    if (process.env.NODE_ENV === "production") {
        return fail(404, "Not Found");
    }

    const { searchParams } = new URL(request.url);
    const admin = searchParams.get("admin") === "1";
    const second = searchParams.get("id") === "2";

    const studentId = admin ? "900000" : second ? "000001" : "000000";
    const enrollmentYear = admin ? "99" : "25";
    const name = admin ? "測試管理員" : second ? "測試學生二" : "測試學生";
    const email = `s${enrollmentYear}${studentId}@fssh.khc.edu.tw`;

    const user = await prisma.user.upsert({
        where: { studentId },
        update: { name, email, enrollmentYear, isAdmin: admin },
        create: { studentId, name, email, enrollmentYear, isAdmin: admin },
    });

    const token = await signToken({
        studentId: user.studentId,
        name: user.name,
        email: user.email,
        enrollmentYear: user.enrollmentYear,
        isAdmin: user.isAdmin,
    });

    return ok({
        token,
        user: {
            studentId: user.studentId,
            name: user.name,
            email: user.email,
            enrollmentYear: user.enrollmentYear,
            isAdmin: user.isAdmin,
        },
    });
}