import "server-only";
import { OAuth2Client } from "google-auth-library";
import { ApiFailure } from "./http";

const client = new OAuth2Client();

export interface GoogleProfile {
    email: string;
    name: string;
}

/** 驗證前端送來的 Google ID Token（GIS credential），回傳信箱與真實姓名 */
export async function verifyGoogleCredential(credential: string): Promise<GoogleProfile> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
        throw new Error("缺少 GOOGLE_CLIENT_ID 環境變數");
    }

    let payload;
    try {
        const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
        payload = ticket.getPayload();
    } catch {
        throw new ApiFailure(401, "Google 憑證驗證失敗，請重新登入");
    }

    if (!payload?.email || payload.email_verified !== true) {
        throw new ApiFailure(401, "Google 帳號信箱未通過驗證");
    }

    return { email: payload.email.toLowerCase(), name: payload.name ?? payload.email };
}

export interface ParsedStudent {
    enrollmentYear: string;
    studentId: string;
}

/**
 * 網域篩選 + 學號拆解：
 * s25410372@fssh.khc.edu.tw → 第 2、3 碼為入學學年（25），其餘為正式學號（410372）
 */
export function parseStudentEmail(email: string): ParsedStudent {
    const domain = (process.env.ALLOWED_EMAIL_DOMAIN ?? "fssh.khc.edu.tw").toLowerCase();
    const [prefix, host] = email.split("@");

    if (host !== domain) {
        throw new ApiFailure(403, `僅限本校帳號（@${domain}）登入`);
    }

    const match = /^[a-z](\d{2})(\d{4,})$/i.exec(prefix);
    if (!match) {
        throw new ApiFailure(403, "帳號格式不符，無法解析學號");
    }

    return { enrollmentYear: match[1], studentId: match[2] };
}

export function isAdminEmail(email: string): boolean {
    const admins = (process.env.ADMIN_EMAILS ?? "")
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
    return admins.includes(email.toLowerCase());
}
