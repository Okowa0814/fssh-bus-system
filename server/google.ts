import "server-only";
import { OAuth2Client } from "google-auth-library";
import { ApiFailure } from "./http";

const client = new OAuth2Client();

export interface GoogleProfile {
    email: string;
    name: string;
}

// Verify the Google ID Token and return the user's profile 
export async function verifyGoogleCredential(credential: string): Promise<GoogleProfile> {
    const clientId = process.env.GOOGLE_CLIENT_ID;

    // Check CLIENT_ID
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

// Parse the student email to extract the "enrollment year" and "student ID"
export function parseStudentEmail(email: string): ParsedStudent {
    const domain = (process.env.ALLOWED_EMAIL_DOMAIN ?? "fssh.khc.edu.tw").toLowerCase();
    const [prefix, host] = email.split("@");

    if (host !== domain) throw new ApiFailure(403, `僅限本校帳號（@${domain}）登入`);
    

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
