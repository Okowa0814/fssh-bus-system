import { prisma } from "@/server/db";
import { signToken } from "@/server/auth";
import { ok, fail, ApiFailure } from "@/server/http";
import { verifyGoogleCredential, parseStudentEmail, isAdminEmail } from "@/server/google";

/**
 * POST /api/auth/google
 * Google 一鍵登入：驗證 credential → 網域篩選 → 學號拆解 → Upsert 使用者 → 簽發 JWT（30 分鐘）
 */
export async function POST(request: Request) {
    let credential: unknown;
    try {
        ({ credential } = await request.json());
    } catch {
        return fail(400, "請求格式錯誤");
    }
    if (typeof credential !== "string" || !credential) {
        return fail(400, "缺少 Google 登入憑證");
    }

    try {
        const profile = await verifyGoogleCredential(credential);
        const admin = isAdminEmail(profile.email);

        // 管理員帳號（如教職員信箱）可能不符合學號格式，改以信箱前綴作為識別碼
        let enrollmentYear = "";
        let studentId = profile.email.split("@")[0];
        try {
            ({ enrollmentYear, studentId } = parseStudentEmail(profile.email));
        } catch (error) {
            if (!admin) {
                throw error;
            }
        }

        const user = await prisma.user.upsert({
            where: { studentId },
            update: {
                name: profile.name,
                email: profile.email,
                enrollmentYear,
                isAdmin: admin,
            },
            create: {
                studentId,
                name: profile.name,
                email: profile.email,
                enrollmentYear,
                isAdmin: admin,
            },
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
    } catch (error) {
        if (error instanceof ApiFailure) {
            return fail(error.status, error.message);
        }
        console.error("Google 登入失敗:", error);
        return fail(500, "登入失敗，請稍後再試");
    }
}
