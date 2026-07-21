"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken, decodeToken, ApiError } from "@/services/api";
import type { LoginResponse } from "@/lib/types";
import { GoogleLoginButton } from "@/components/GoogleLoginButton";
import { BusIcon } from "@/components/icons";

const steps = [
    { title: "使用學校帳號登入", desc: "點擊登入按鈕，選擇學校提供的 Google 帳號" },
    { title: "選擇路線與座位", desc: "進入登記頁，依步驟選擇路線與想坐的座位" },
    { title: "完成登記", desc: "送出後立即知道結果，可於身份頁查看或取消" },
];

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
        <div className="grid min-h-dvh place-items-center px-5 py-10">
            <div className="w-full max-w-md space-y-5">

                {/* Header */}
                <div className="text-center">
                    <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-white">
                        <BusIcon className="size-7" />
                    </span>
                    <h1 className="mt-4 text-2xl font-bold tracking-tight">鳳山高中專車登記系統</h1>
                    <p className="mt-1.5 text-sm text-muted">...</p>
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
                
                {/* Steps Box */}
                <div className="rounded-3xl border border-line bg-surface p-7">
                    <h2 className="text-sm font-semibold text-muted">如何登記</h2>

                    <ol className="mt-4 space-y-4">
                        {steps.map((step, index) => (
                            <li key={step.title} className="flex gap-3.5">
                                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-wash text-sm font-semibold text-accent-ink">
                                    {index + 1}
                                </span>
                                <div>
                                    <p className="text-sm font-semibold">{step.title}</p>
                                    <p className="mt-0.5 text-xs leading-relaxed text-muted">
                                        {step.desc}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ol>

                    <p className="mt-5 rounded-xl bg-accent-wash px-4 py-3 text-xs leading-relaxed text-accent-ink">
                        每人限登記一個座位；於登記時間內皆可取消並重新選位。座位以登記先後為準。
                    </p>
                </div>
            </div>
        </div>
    );
}
