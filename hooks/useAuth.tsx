"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { decodeToken, clearToken } from "@/services/api";
import type { TokenPayload } from "@/lib/types";

export type AuthStatus = "loading" | "ready" | "denied";

interface CurrentUser {
    user: TokenPayload;
    logout: () => void;
}

const AuthContext = createContext<CurrentUser | null>(null);

/** 供已驗證的頁面使用：從最近的 AuthProvider（layout 內）取得使用者資訊 */
export function useCurrentUser(): CurrentUser {
    const value = useContext(AuthContext);
    if (!value) {
        throw new Error("useCurrentUser 必須在 AuthProvider 底下使用");
    }
    return value;
}

export function AuthProvider({ user, logout, children }: CurrentUser & { children: ReactNode }) {
    return <AuthContext.Provider value={{ user, logout }}>{children}</AuthContext.Provider>;
}

/** 前端登入守衛的共用實作，由下面兩支明確命名的 hook 各自呼叫 */
function useAuthGuard(role: "student" | "admin") {
    const router = useRouter();
    const [user, setUser] = useState<TokenPayload | null>(null);
    const [status, setStatus] = useState<AuthStatus>("loading");

    useEffect(() => {
        const payload = decodeToken();
        if (!payload) {
            router.replace("/login");
            return;
        }
        if (role === "admin" && !payload.isAdmin) {
            // 權限不符直接回 404，不洩漏管理端點的存在（與後端行為一致）
            setStatus("denied");
            return;
        }
        if (role === "student" && payload.isAdmin) {
            // 管理員帳號一律導回管理後台，徹底切開兩種身份能看到的頁面
            router.replace("/admin");
            return;
        }
        setUser(payload);
        setStatus("ready");
    }, [router, role]);

    const logout = useCallback(() => {
        clearToken();
        router.replace("/login");
    }, [router]);

    return { user, status, logout };
}

/** 供 app/(student) layout 使用：未登入導回登入頁，管理員帳號導回 /admin */
export function useStudentGuard() {
    return useAuthGuard("student");
}

/** 供 app/admin layout 使用：未登入導回登入頁，非管理員帳號視為 denied（頁面顯示 404） */
export function useAdminGuard() {
    return useAuthGuard("admin");
}
