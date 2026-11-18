"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { api, setToken, decodeToken, ApiError } from "@/services/api";
import type { LoginResponse } from "@/lib/types";
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

const mTile = "relative overflow-hidden rounded-[6px] bg-surface";
const mBody = "relative aspect-square overflow-hidden rounded-[6px] bg-line";
const mWheel = `${mTile} aspect-[2/1]`;

// 手機版的幾何積木校車插圖（純裝飾，白色方塊配淺灰底）
function BusIllustrationMobile() {
    return (
        <div aria-hidden="true" className="grid w-full grid-cols-4 gap-2">
            {/* 第一排 */}
            <div className={`${mTile} aspect-square`}>
                <span className="absolute top-[18%] left-[18%] size-[64%] rounded-full bg-accent" />
            </div>
            <div className={`${mTile} aspect-square`}>
                <span className="absolute bottom-0 left-0 h-1/2 w-full rounded-t-full bg-line" />
            </div>
            <div className={`${mTile} aspect-square`}>
                <span className="absolute bottom-0 left-0 size-[62%] rounded-tr-full bg-fg" />
            </div>
            <div className={`${mTile} aspect-square`}>
                <span className="absolute top-[20%] left-[20%] size-[60%] rounded-full border-[7px] border-line" />
            </div>

            {/* 第二排：車身 */}
            <div className={mBody}>
                <span className="absolute top-[18%] left-[20%] h-[46%] w-[60%] rounded-lg bg-surface" />
            </div>
            <div className={mBody}>
                <span className="absolute top-[18%] left-[20%] h-[46%] w-[60%] rounded-lg bg-accent" />
            </div>
            <div className={mBody}>
                <span className="absolute top-[18%] left-[20%] h-[46%] w-[60%] rounded-lg bg-surface" />
            </div>
            <div className={`${mBody} rounded-tr-[58%]`}>
                <span className="absolute top-[18%] left-[14%] h-[46%] w-[52%] rounded-lg rounded-tr-[44%] bg-surface" />
                <span className="absolute right-[12%] bottom-[14%] size-[14%] rounded-[2px] bg-accent" />
            </div>

            {/* 第三排：車輪與路面 */}
            <div className={mWheel}>
                <span className="absolute -top-1/2 left-1/4 h-full w-1/2 rounded-full bg-fg" />
            </div>
            <div className={mWheel}>
                <span className="absolute top-[20%] left-[38%] h-[60%] w-[24%] bg-accent [clip-path:polygon(0_0,100%_50%,0_100%)]" />
            </div>
            <div
                className={`${mWheel} bg-[repeating-linear-gradient(-45deg,var(--line)_0_6px,var(--surface)_6px_13px)]`}
            />
            <div className={mWheel}>
                <span className="absolute -top-1/2 left-1/4 h-full w-1/2 rounded-full bg-fg" />
            </div>
        </div>
    );
}

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // If the user is already logged in, redirect them to the appropriate page
    useEffect(() => {
        const payload = decodeToken();

        if (payload) router.replace(payload.isAdmin ? "/admin" : "/");
    }, [router]);

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
        <div className="flex min-h-dvh flex-col bg-[#f3f4f6] md:bg-bg">
            {/* Header */}
            <header className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 pt-5 md:px-14 md:py-7">
                <div className="flex items-center gap-2.5 md:gap-3">
                    <BadgeIcon size={40} className="max-md:size-[34px]!" />
                    <span className="flex flex-col gap-0.5">
                        <span className="text-[15px] font-bold md:text-base">鳳山高中專車登記</span>
                        <span className="text-[13px] text-muted">國立鳳山高級中學</span>
                    </span>
                </div>
                {/* 手機版的路線／說明按鈕移到下方登入面板 */}
                <nav aria-label="不需登入" className="-mx-2 hidden gap-1 md:mx-0 md:flex md:gap-2">
                    <RoutesModal />
                    <HelpGuideModal />
                </nav>
            </header>

            {/* Mobile: decorative bus（佔滿登入面板上方的剩餘空間） */}
            <div className="flex flex-1 items-center justify-center px-6 pt-5 pb-10 md:hidden">
                <BusIllustrationMobile />
            </div>

            <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 rounded-t-[28px] bg-surface px-6 pt-8 pb-8 shadow-[0_-12px_32px_-24px_rgba(28,28,30,0.25)] max-md:relative max-md:-mt-5 md:flex-1 md:rounded-none md:bg-transparent md:px-14 md:pt-10 md:pb-14 md:shadow-none lg:flex-row lg:items-center lg:gap-18 lg:pt-6">
                {/* Left: login */}
                <section className="flex w-full min-w-0 flex-col gap-[22px] md:max-w-[520px] md:gap-9 lg:flex-1">
                    <div className="flex flex-col gap-2.5 md:gap-5">
                        <h1 className="font-display text-[30px] leading-[1.25] font-bold tracking-[-0.01em] md:text-[clamp(36px,4.2vw,60px)] md:leading-[1.18]">
                            搭校車，
                            <br className="hidden md:block" />
                            先登記座位。
                        </h1>
                        <p className="max-w-[26em] text-[15px] leading-[1.7] text-muted md:text-lg md:leading-[1.75]">
                            登入，選路線、挑座位。
                        </p>
                    </div>

                    {/* Google login */}
                    <div className="flex flex-col gap-2.5 md:gap-3">
                        {loading ? (
                            <p className="flex min-h-11 items-center justify-center text-muted md:justify-start">
                                登入中…
                            </p>
                        ) : (
                            <GoogleLoginButton onCredential={handleGoogleAuth} />
                        )}
                        <p className="text-center text-[13px] leading-[1.7] text-muted md:text-left md:text-sm">
                            限用 @fssh.khc.edu.tw 帳號
                        </p>
                    </div>

                    {/* Mobile: 不需登入即可查看 */}
                    <nav aria-label="登入前可查看" className="grid grid-cols-2 gap-2.5 md:hidden">
                        <RoutesModal variant="pill" />
                        <HelpGuideModal variant="pill" />
                    </nav>

                    {/* First-time hint */}
                    <div className="hidden items-center justify-between gap-4 rounded-[20px] bg-surface2 px-6 py-5.5 md:flex">
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
