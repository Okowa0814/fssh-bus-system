"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { api, setToken, decodeToken, ApiError } from "@/services/api";
import type { LoginResponse, PublicStatsDto } from "@/lib/types";
import { GoogleLoginButton } from "@/components/";

export default function LoginPage() {
    const router = useRouter();
    const [stats, setStats] = useState<PublicStatsDto | null>(null);
    const [loading, setLoading] = useState(false);

    // If the user is already logged in, redirect them to the appropriate page
    useEffect(() => {
        const payload = decodeToken();

        if (payload) router.replace(payload.isAdmin ? "/admin" : "/");
    }, [router]);

    // Fetch public stats (including route count and seat availability) on mount
    useEffect(() => {
        api<PublicStatsDto>("/api/public/stats").then(setStats).catch(() => {});
    }, []);

    const handleGoogleAuth = async (credential: string) => {
        setLoading(true);

        try {
            const result = await api<LoginResponse>("/api/auth/google", {
                method: "POST",
                body: { credential },
            });
            setToken(result.token);
            router.replace(result.user.isAdmin ? "/admin" : "/");
        } catch (error) {
            alert(error instanceof ApiError ? error.message : "登入失敗，請稍後再試");
            setLoading(false);
        }
    };

    // For dev
    const handleDevLogin = async (admin: boolean, id?: string) => {
        setLoading(true);

        try {
            const query = new URLSearchParams({ admin: admin ? "1" : "0" });

            if (id) query.set("id", id);

            const result = await api<LoginResponse>(`/api/auth/dev-login?${query.toString()}`);

            setToken(result.token);
            router.replace(result.user.isAdmin ? "/admin" : "/");
        } catch (error) {
            alert(error instanceof ApiError ? error.message : "登入失敗，請稍後再試");
            setLoading(false);
        }
    };

    return (
        <div className="grid min-h-dvh bg-bg md:grid-cols-2">
            {/* Branding Section */}
            <div className="relative flex min-h-[420px] flex-col overflow-hidden bg-accent-wash px-7 py-11 md:px-14 md:py-16">
                {/* Background Decorative Elements */}
                <div className="pointer-events-none absolute -right-20 -bottom-32 size-80 rounded-full bg-accent opacity-10 blur-md" />
                <div className="pointer-events-none absolute -top-28 -right-14 size-64 rounded-full bg-accent opacity-[0.07]" />

                {/* Icon Section */}
                <div className="relative flex items-center gap-3">
                    <Image
                        src="/fssh-badge.png"
                        alt="鳳山高中校徽"
                        width={48}
                        height={48}
                        className="rounded-full"
                    />
                    <span className="text-xl font-medium text-muted">高雄市立鳳山高級中學</span>
                </div>

                {/* Spacer */}
                <div className="relative flex-[2]" />

                {/* Text Section */}
                <div className="relative flex flex-col gap-4.5">
                    <h1 className="text-[clamp(30px,4.6vw,52px)] leading-[1.16] font-bold tracking-tight text-balance">
                        專車登記<br/>
                        系統
                    </h1>

                    <p className="text-[15px] leading-relaxed text-muted">
                        每學期的校車座位，一分鐘就登記好。<br/>
                        用學校 Google 帳號登入，快速又方便。
                    </p>

                    {stats && stats.routeCount > 0 && (
                        <div className="flex items-center gap-2.5 font-mono text-muted">
                            <span>{stats.routeCount} 條路線</span>
                            <span>·</span>
                            <span>{stats.totalSeats} 個座位</span>
                        </div>
                    )}
                </div>

                <div className="relative flex-1" />
            </div>

            {/* Login Card */}
            <div className="flex items-center justify-center px-7 py-11 md:px-14 md:py-16">
                <div className="flex w-full max-w-sm flex-col gap-6.5">

                    {/* Welcome Text Section */}
                    <div>
                        <h2 className="text-4xl font-bold tracking-tight">歡迎回來</h2>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted">
                            請使用學校配發的 Google 帳號 (@fssh.khc.edu.tw) 登入
                        </p>
                    </div>

                    {/* Google Login Button Section */}
                    <div>
                        {loading ? (
                            <p className="text-center text-sm text-muted">登入中…</p>
                        ) : (
                            <GoogleLoginButton onCredential={handleGoogleAuth} />
                        )}
                    </div>
                    
                    {/* Dev Login Section (only visible in development mode) */}
                    {process.env.NODE_ENV !== "production" && (
                        <div className="flex flex-col gap-2.5 border-t border-line pt-4.5">
                            <p className="text-xs text-muted">開發測試用（正式環境不會顯示）</p>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    disabled={loading}
                                    onClick={() => handleDevLogin(false)}
                                    className="rounded-full bg-surface2 px-3 py-1.5 text-xs text-muted transition disabled:opacity-50"
                                >
                                    學生 test01
                                </button>
                                <button
                                    type="button"
                                    disabled={loading}
                                    onClick={() => handleDevLogin(false, "2")}
                                    className="rounded-full bg-surface2 px-3 py-1.5 text-xs text-muted transition disabled:opacity-50"
                                >
                                    學生 test02
                                </button>
                                <button
                                    type="button"
                                    disabled={loading}
                                    onClick={() => handleDevLogin(true)}
                                    className="rounded-full bg-surface2 px-3 py-1.5 text-xs text-muted transition disabled:opacity-50"
                                >
                                    管理員 admin
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
