"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { decodeToken, clearToken } from "@/services/api";
import type { TokenPayload } from "@/lib/types";

export type AuthStatus = "loading" | "ready" | "denied";

/**
 * 前端登入守衛：
 * - 未登入 / token 過期 → 導回登入頁
 * - admin 頁面權限不符 → status 為 denied，頁面顯示 404（與後端行為一致）
 */
export function useAuth(options?: { admin?: boolean }) {
    const router = useRouter();
    const [user, setUser] = useState<TokenPayload | null>(null);
    const [status, setStatus] = useState<AuthStatus>("loading");
    const requireAdmin = options?.admin === true;

    useEffect(() => {
        const payload = decodeToken();
        if (!payload) {
            router.replace("/login");
            return;
        }
        if (requireAdmin && !payload.isAdmin) {
            setStatus("denied");
            return;
        }
        setUser(payload);
        setStatus("ready");
    }, [router, requireAdmin]);

    const logout = useCallback(() => {
        clearToken();
        router.replace("/login");
    }, [router]);

    return { user, status, logout };
}
