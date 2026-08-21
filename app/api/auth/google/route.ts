import { prisma } from "@/server/db";
import { signToken } from "@/server/auth";
import { ok, fail, ApiFailure } from "@/server/http";
import { verifyGoogleCredential, parseStudentEmail, isAdminEmail } from "@/server/google";

/*
- POST /api/auth/google
- Google Login: Verify credential → Domain filter → Parse student ID → Upsert user → Sign JWT (30 minutes)
*/
export async function POST(request: Request) {
    let credential: unknown;

    // Check vaild json
    try {
        ({ credential } = await request.json());
    } catch {
        return fail(400, "請求格式錯誤");
    }

    // Check credential
    if (typeof credential !== "string" || !credential){
        return fail(400, "缺少 Google 登入憑證");
    }

    try {
        const profile = await verifyGoogleCredential(credential);
        const admin = isAdminEmail(profile.email);

        // Teachers and Admins can login without a student ID, but students must have a valid student ID
        let enrollmentYear = "";
        let studentId = profile.email.split("@")[0];
        
        try {
            ({ enrollmentYear, studentId } = parseStudentEmail(profile.email));
        } catch (error) {
            if (!admin) throw error;
        }

        const user = await prisma.user.upsert({
            where: { enrollmentYear_studentId: { enrollmentYear, studentId } },
            update: {
                name: profile.name,
                email: profile.email,
                isAdmin: admin,
            },
            create: {
                enrollmentYear,
                studentId,
                name: profile.name,
                email: profile.email,
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
        if (error instanceof ApiFailure){
            return fail(error.status, error.message);
        }
        
        console.error("Google 登入失敗:", error);
        return fail(500, "登入失敗，請稍後再試");
    }
}
