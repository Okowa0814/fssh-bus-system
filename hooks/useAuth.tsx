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

export function useCurrentUser(): CurrentUser {
    const value = useContext(AuthContext);

    if (!value) throw new Error("useCurrentUser must be used within an AuthProvider");
    return value;
}

export function AuthProvider({ user, logout, children }: CurrentUser & { children: ReactNode }) {
    return <AuthContext.Provider value={{ user, logout }}>{children}</AuthContext.Provider>;
}


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
            setStatus("denied");
            return;
        }
        if (role === "student" && payload.isAdmin) {
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
