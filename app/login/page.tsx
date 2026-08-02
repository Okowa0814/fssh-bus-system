"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken, decodeToken, ApiError } from "@/services/api";
import type { LoginResponse, PublicStatsDto } from "@/lib/types";
import { GoogleLoginButton } from "@/components/";

export default function LoginPage() {
    const router = useRouter();
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<PublicStatsDto | null>(null);

    // If the user is already logged in, redirect them to the appropriate page
    useEffect(() => {
        const payload = decodeToken();

        if (payload) router.replace(payload.isAdmin ? "/admin" : "/");
    }, [router]);

    useEffect(() => {
        api<PublicStatsDto>("/api/public/stats").then(setStats).catch(() => {});
    }, []);

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
        <div className="grid min-h-dvh bg-bg md:grid-cols-2">
            {/* 品牌區塊 */}
            <div className="relative flex min-h-[420px] flex-col overflow-hidden bg-accent-wash px-7 py-11 md:px-14 md:py-16">
                <div className="pointer-events-none absolute -right-20 -bottom-32 size-80 rounded-full bg-accent opacity-10 blur-md" />
                <div className="pointer-events-none absolute -top-28 -right-14 size-64 rounded-full bg-accent opacity-[0.07]" />

                <div className="relative flex items-center gap-3">
                    <Image
                        src="/fssh-badge.png"
                        alt="鳳山高中校徽"
                        width={40}
                        height={40}
                        style={{ width: 40, height: 40 }}
                        className="rounded-full"
                    />
                    <span className="text-[13px] font-medium text-muted">高雄市立鳳山高級中學</span>
                </div>

                <div className="relative flex-[3]" />

                <div className="relative flex flex-col gap-4.5">
                    <h1 className="text-[clamp(30px,4.6vw,52px)] leading-[1.16] font-bold tracking-tight text-balance">
                        專車登記
                        <br />
                        系統
                    </h1>
                    <p className="max-w-[30ch] text-[15px] leading-relaxed text-muted">
                        每天下午的座位，三十秒就登記好。用學校 Google 帳號登入，就能看到今天還剩幾個位子。
                    </p>
                    {stats && stats.routeCount > 0 && (
                        <div className="flex items-center gap-2.5 font-mono text-[11px] text-muted">
                            <span>{stats.routeCount} 條路線</span>
                            <span>·</span>
                            <span>{stats.totalSeats} 個座位</span>
                        </div>
                    )}
                </div>

                <div className="relative flex-1" />
            </div>

            {/* 登入卡片 */}
            <div className="flex items-center justify-center px-7 py-11 md:px-14 md:py-16">
                <div className="flex w-full max-w-sm flex-col gap-6.5">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">歡迎回來</h2>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted">
                            請使用學校配發的 Google 帳號登入
                        </p>
                    </div>

                    <div>
                        {loading ? (
                            <p className="text-center text-sm text-muted">登入中…</p>
                        ) : (
                            <GoogleLoginButton onCredential={handleGoogleAuth} />
                        )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-muted">
                        <div className="h-px flex-1 bg-line" />
                        僅限 @fssh.khc.edu.tw
                        <div className="h-px flex-1 bg-line" />
                    </div>

                    {message && (
                        <p className="rounded-field bg-danger-wash px-4 py-3 text-center text-sm text-danger-ink">
                            {message}
                        </p>
                    )}

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
