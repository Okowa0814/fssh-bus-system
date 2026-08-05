import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { fail } from "./http";
import { prisma } from "./db";
import type { NextResponse } from "next/server";

export interface AuthUser {
    studentId: string;
    name: string;
    email: string;
    enrollmentYear: string;
    isAdmin: boolean;
}

const TOKEN_TTL = "30m"; // 依規格：token 30 分鐘過期

function secretKey(): Uint8Array {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("缺少 JWT_SECRET 環境變數");
    }
    return new TextEncoder().encode(secret);
}

export async function signToken(user: AuthUser): Promise<string> {
    return new SignJWT({
        name: user.name,
        email: user.email,
        enrollmentYear: user.enrollmentYear,
        isAdmin: user.isAdmin,
    })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(user.studentId)
        .setIssuedAt()
        .setExpirationTime(TOKEN_TTL)
        .sign(secretKey());
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
    try {
        const { payload } = await jwtVerify(token, secretKey());
        if (!payload.sub) {
            return null;
        }
        return {
            studentId: payload.sub,
            name: String(payload.name ?? ""),
            email: String(payload.email ?? ""),
            enrollmentYear: String(payload.enrollmentYear ?? ""),
            isAdmin: payload.isAdmin === true,
        };
    } catch {
        return null;
    }
}

async function getAuthUser(request: Request): Promise<AuthUser | null> {
    const header = request.headers.get("authorization");
    if (!header?.startsWith("Bearer ")) {
        return null;
    }
    return verifyToken(header.slice("Bearer ".length));
}

/** 僅限學生使用：管理員帳號回 403，徹底切開管理員與學生的操作權限 */
export async function requireStudent(request: Request): Promise<AuthUser | NextResponse> {
    const user = await getAuthUser(request);
    if (!user) {
        return fail(401, "尚未登入或登入已過期");
    }
    if (user.isAdmin) {
        return fail(403, "管理員帳號無法使用此功能");
    }
    return user;
}

/**
 * 需要管理員：依規格「權限不符直接返回 404」，不洩漏管理端點的存在。
 * JWT 的 isAdmin 只反映簽發當下的狀態，30 分鐘效期內不會自動更新；
 * 這裡額外即時查一次 DB，管理員被收回權限或帳號被停用後，舊 token 立刻失效。
 */
export async function requireAdmin(request: Request): Promise<AuthUser | NextResponse> {
    const user = await getAuthUser(request);
    if (!user || !user.isAdmin) {
        return fail(404, "Not Found");
    }
    const dbUser = await prisma.user.findUnique({
        where: { studentId: user.studentId },
        select: { isAdmin: true },
    });
    if (!dbUser?.isAdmin) {
        return fail(404, "Not Found");
    }
    return user;
}

export function isResponse(value: AuthUser | NextResponse): value is NextResponse {
    return value instanceof Response;
}
