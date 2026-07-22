"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api, setToken, decodeToken, ApiError } from "@/services/api";
import type { LoginResponse } from "@/lib/types";
import { GoogleLoginButton, ThemeToggle } from "@/components/";

export default function LoginPage() {
    const router = useRouter();
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // If the user is already logged in, redirect them to the appropriate page
    useEffect(() => {
        const payload = decodeToken();

        if (payload) router.replace(payload.isAdmin ? "/admin" : "/");
    }, [router]);

    const handleGoogleAuth = async (credential: string) => {
        setLoading(true);
        setMessage(null);
        try {
            const result = await api<LoginResponse>("/api/auth/google", {
                method: "POST",
                body: { credential },
            });
            setToken(result.token);
            router.replace(result.user.isAdmin ? "/admin" : "/");
        } catch (error) {
            setMessage(error instanceof ApiError ? error.message : "登入失敗，請稍後再試");
            setLoading(false);
        }
    };

    // For dev
    const handleDevLogin = async (admin: boolean) => {
        setLoading(true);
        setMessage(null);
        try {
            const result = await api<LoginResponse>(`/api/auth/dev-login?admin=${admin ? "1" : "0"}`);
            setToken(result.token);
            router.replace(result.user.isAdmin ? "/admin" : "/");
        } catch (error) {
            setMessage(error instanceof ApiError ? error.message : "登入失敗，請稍後再試");
            setLoading(false);
        }
    };

    return (
        <div className="relative grid min-h-dvh place-items-center px-5 py-10">

            <div className="absolute right-5 top-5">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-md space-y-5">

                {/* Header */}
                <div className="text-center">
                    <Image src="/fssh-badge.png" alt="鳳山高中校徽" width={56} height={56} className="mx-auto rounded-full" priority />
                    <h1 className="mt-4 text-2xl font-bold tracking-tight">鳳山高中專車登記系統</h1>
                </div>

                {/* Login Box */}
                <div className="rounded-3xl border border-line bg-surface p-7">
                    <h2 className="text-center text-2xl font-semibold">登入</h2>
                    
                    <p className="mt-1 text-center text-xs text-muted">
                        僅限本校 Google Workspace 帳號（@fssh.khc.edu.tw）
                    </p>

                    <div className="mt-5">
                        {loading ? (
                            <p className="text-center text-sm text-muted">登入中…</p>
                        ) : (
                            <GoogleLoginButton onCredential={handleGoogleAuth} />
                        )}
                    </div>

                    {message && (
                        <p className="mt-4 rounded-xl bg-danger-wash px-4 py-3 text-center text-sm text-danger-ink">
                            {message}
                        </p>
                    )}

                    {process.env.NODE_ENV !== "production" && (
                        <div className="mt-5 space-y-2 border-t border-line pt-4">
                            <p className="text-center text-xs text-muted">開發測試用（正式環境不會顯示）</p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    disabled={loading}
                                    onClick={() => handleDevLogin(false)}
                                    className="flex-1 rounded-xl border border-line py-2 text-sm disabled:opacity-50"
                                >
                                    測試登入（學生）
                                </button>
                                <button
                                    type="button"
                                    disabled={loading}
                                    onClick={() => handleDevLogin(true)}
                                    className="flex-1 rounded-xl border border-line py-2 text-sm disabled:opacity-50"
                                >
                                    測試登入（管理員）
                                </button>
                            </div>
                        </div>
                    )}

                    
                </div>
                
                
            </div>
        </div>
    );
}
