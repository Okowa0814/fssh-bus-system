"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { api, setToken, decodeToken, ApiError } from "@/services/api";
import type { LoginResponse, PublicStatsDto } from "@/lib/types";
import { GoogleLoginButton, HelpGuideModal, RoutesModal } from "@/components/";
import { BadgeIcon, HelpIcon } from "@/components/icons";

const tile = "relative aspect-square overflow-hidden rounded-md";

// 右側的幾何積木校車插圖（純裝飾）
function BusIllustration() {
    return (
        <div aria-hidden="true" className="grid w-full max-w-[560px] grid-cols-4 gap-2.5">
            {/* 第一排 */}
            <div className={`${tile} bg-surface2`}>
                <span className="absolute top-[18%] left-[18%] size-[64%] rounded-full bg-accent" />
            </div>
            <div className={`${tile} bg-surface2`}>
                <span className="absolute bottom-0 left-0 h-1/2 w-full rounded-t-full bg-line" />
            </div>
            <div className={`${tile} bg-surface2`}>
                <span className="absolute bottom-0 left-0 size-[62%] rounded-tr-full bg-fg" />
            </div>
            <div className={`${tile} bg-surface2`}>
                <span className="absolute top-[20%] left-[20%] size-[60%] rounded-full border-[9px] border-line" />
            </div>

            {/* 第二排：車身 */}
            <div className={`${tile} bg-line`}>
                <span className="absolute top-[18%] left-[20%] h-[46%] w-[60%] rounded-[10px] bg-surface" />
            </div>
            <div className={`${tile} bg-line`}>
                <span className="absolute top-[18%] left-[20%] h-[46%] w-[60%] rounded-[10px] bg-accent" />
            </div>
            <div className={`${tile} bg-line`}>
                <span className="absolute top-[18%] left-[20%] h-[46%] w-[60%] rounded-[10px] bg-surface" />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-md rounded-tr-[58%] bg-line">
                <span className="absolute top-[18%] left-[14%] h-[46%] w-[52%] rounded-[10px] rounded-tr-[44%] bg-surface" />
                <span className="absolute right-[12%] bottom-[14%] size-[14%] rounded-[3px] bg-accent" />
            </div>

            {/* 第三排：車輪與路面 */}
            <div className={`${tile} bg-surface2`}>
                <span className="absolute -top-1/4 left-1/4 size-1/2 rounded-full bg-fg" />
                <span className="absolute -top-[8%] left-[42%] size-[16%] rounded-full bg-surface2" />
            </div>
            <div className={`${tile} bg-surface2`}>
                <span className="absolute top-[26%] left-[30%] h-[48%] w-[44%] bg-accent [clip-path:polygon(0_0,100%_50%,0_100%)]" />
            </div>
            <div
                className={`${tile} bg-[repeating-linear-gradient(-45deg,var(--line)_0_9px,var(--surface2)_9px_20px)]`}
            />
            <div className={`${tile} bg-surface2`}>
                <span className="absolute -top-1/4 left-1/4 size-1/2 rounded-full bg-fg" />
                <span className="absolute -top-[8%] left-[42%] size-[16%] rounded-full bg-surface2" />
            </div>
        </div>
    );
}

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

    const devButton =
        "rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] text-fg2 transition hover:border-fg disabled:opacity-50";

    return (
        <div className="flex min-h-dvh flex-col bg-bg">
            {/* Header */}
            <header className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-4 md:px-14 md:py-7">
                <div className="flex items-center gap-3">
                    <BadgeIcon size={40} />
                    <span className="flex flex-col gap-0.5">
                        <span className="text-base font-bold">鳳山高中專車登記</span>
                        <span className="text-[13px] text-muted">高雄市立鳳山高級中學</span>
                    </span>
                </div>
                <nav aria-label="不需登入" className="-mx-2 flex gap-1 md:mx-0 md:gap-2">
                    <RoutesModal />
                    <HelpGuideModal />
                </nav>
            </header>

            <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-10 px-5 pt-6 pb-10 md:px-14 md:pt-10 md:pb-14 lg:flex-row lg:items-center lg:gap-18 lg:pt-6">
                {/* Left: login */}
                <section className="flex w-full min-w-0 flex-col gap-7 md:max-w-[520px] md:gap-9 lg:flex-1">
                    <div className="flex flex-col gap-4 md:gap-5">
                        <h1 className="font-display text-[clamp(36px,4.2vw,60px)] leading-[1.18] font-bold tracking-[-0.01em]">
                            搭校車，
                            <br />
                            先登記座位。
                        </h1>
                        <p className="max-w-[26em] text-base leading-[1.75] text-muted md:text-lg">
                            登入，選路線、挑座位。
                        </p>
                    </div>

                    {/* Google login */}
                    <div className="flex flex-col gap-3">
                        {loading ? (
                            <p className="flex min-h-11 items-center text-muted">登入中…</p>
                        ) : (
                            <GoogleLoginButton onCredential={handleGoogleAuth} />
                        )}
                        <p className="text-sm leading-[1.7] text-muted">
                            限用 @fssh.khc.edu.tw 帳號
                        </p>
                    </div>

                    {/* First-time hint */}
                    <div className="flex items-center justify-between gap-4 rounded-[20px] bg-surface2 px-6 py-5.5">
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="text-[17px] font-bold">第一次使用嗎？</span>
                            <span className="text-sm leading-relaxed text-muted">
                            點選上方「使用說明」，了解登記與搭車的完整步驟。
                            </span>
                        </span>
                        <HelpIcon className="size-7 shrink-0 text-fg" />
                    </div>

                    {/* Dev Login Section (only visible in development mode) */}
                    {process.env.NODE_ENV !== "production" && (
                        <div className="flex flex-wrap items-center gap-2 rounded-[14px] border border-dashed border-line-strong px-3.5 py-3">
                            <span className="w-full text-xs text-muted">開發測試用，正式環境不會顯示</span>
                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => handleDevLogin(false)}
                                className={devButton}
                            >
                                學生 test01
                            </button>
                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => handleDevLogin(false, "2")}
                                className={devButton}
                            >
                                學生 test02
                            </button>
                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => handleDevLogin(true)}
                                className={devButton}
                            >
                                管理員 admin
                            </button>
                        </div>
                    )}
                </section>

                {/* Right: geometric bus */}
                <section className="hidden min-w-0 flex-1 justify-end lg:flex">
                    <BusIllustration />
                </section>
            </main>
        </div>
    );
}
