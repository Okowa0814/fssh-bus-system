"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/useAuth";
import { api } from "@/services/api";
import type { MeResponse, BookingWindowDto, RouteDto } from "@/lib/types";

function greeting(): string {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 11) return "早安";
    if (hour >= 11 && hour < 18) return "午安";
    return "晚安";
}

function todayLabel(): string {
    const d = new Date();
    const week = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
    return `${d.getFullYear()} / ${String(d.getMonth() + 1).padStart(2, "0")} / ${String(d.getDate()).padStart(2, "0")}（${week}）`;
}

function formatCountdown(endIso: string, now: number): string {
    let ms = new Date(endIso).getTime() - now;
    if (ms < 0) ms = 0;
    const hh = Math.floor(ms / 3600000);
    const mm = Math.floor((ms % 3600000) / 60000);
    return hh > 0 ? `${hh} 小時 ${String(mm).padStart(2, "0")} 分` : `${mm} 分`;
}

export default function HomePage() {
    const { user } = useCurrentUser();
    const [me, setMe] = useState<MeResponse | null>(null);
    const [window_, setWindow] = useState<BookingWindowDto | null>(null);
    const [routes, setRoutes] = useState<RouteDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [now, setNow] = useState(() => Date.now());

    const load = () => {
        setLoading(true);
        setError(false);
        Promise.all([
            api<MeResponse>("/api/student/me"),
            api<BookingWindowDto>("/api/student/booking-window"),
            api<RouteDto[]>("/api/student/routes"),
        ])
            .then(([meData, windowData, routesData]) => {
                setMe(meData);
                setWindow(windowData);
                setRoutes(routesData);
            })
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- 掛載即抓資料，與 profile 頁一致的既有寫法
        load();
    }, []);

    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 30_000);
        return () => clearInterval(t);
    }, []);

    const booked = me?.booking ?? null;

    return (
        <div className="flex flex-col gap-5.5">
            <div>
                <p className="font-mono text-xs tracking-wide text-muted">{todayLabel()}</p>
                <h1 className="mt-2 text-[clamp(22px,3.4vw,30px)] leading-tight font-bold tracking-tight">
                    {greeting()}，{user.name}！
                </h1>
            </div>

            {loading ? (
                <div className="flex flex-col gap-3.5 rounded-card bg-surface p-6.5 shadow-card">
                    <div className="h-3 w-24 animate-pulse rounded bg-line" />
                    <div className="h-7 w-3/5 animate-pulse rounded-lg bg-line" />
                    <div className="h-11 animate-pulse rounded-field bg-line" />
                </div>
            ) : error ? (
                <div className="flex flex-col items-start gap-3.5 rounded-card bg-surface p-7.5 shadow-card">
                    <span className="grid size-8.5 place-items-center rounded-full bg-danger-wash text-[16px] font-medium text-danger-ink">
                        !
                    </span>
                    <div>
                        <p className="text-[19px] font-bold tracking-tight">連不上伺服器</p>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted">
                            先確認一下網路，或稍等幾秒再試一次。
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={load}
                        className="rounded-field bg-fg px-5 py-2.5 text-sm font-medium text-bg"
                    >
                        重新載入
                    </button>
                </div>
            ) : !window_?.open ? (
                <div className="flex flex-col gap-4 rounded-card bg-surface p-7 shadow-card">
                    <div className="flex items-center gap-2 font-mono text-[11px] tracking-wide text-muted uppercase">
                        <span className="size-1.5 rounded-full bg-warning" />
                        非登記時間
                    </div>
                    <div>
                        <p className="text-[clamp(22px,3.6vw,28px)] leading-snug font-bold tracking-tight">
                            目前不在登記時間
                        </p>
                        <p className="mt-2 max-w-[36ch] text-sm leading-relaxed text-muted">
                            {window_?.start && window_?.end ? (
                                <>
                                    開放時間：
                                    {new Date(window_.start).toLocaleString("zh-TW", { hour12: false })} ～{" "}
                                    {new Date(window_.end).toLocaleString("zh-TW", { hour12: false })}
                                </>
                            ) : (
                                "尚未公告登記時間，請留意學校公告。"
                            )}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                        <button
                            type="button"
                            disabled
                            className="cursor-not-allowed rounded-field bg-surface2 px-5.5 py-3 text-sm font-medium text-muted"
                        >
                            立即登記
                        </button>
                        <Link
                            href="/routes"
                            className="rounded-field border border-line px-5.5 py-3 text-sm"
                        >
                            查看時刻表
                        </Link>
                    </div>
                </div>
            ) : booked ? (
                <div className="relative flex flex-col gap-5 overflow-hidden rounded-card bg-fg p-7 text-bg shadow-card-lg">
                    <div className="pointer-events-none absolute -right-18 -bottom-28 size-60 rounded-full bg-accent opacity-30 blur-sm" />
                    <div className="relative flex items-center gap-2 font-mono text-[11px] tracking-wide text-success uppercase opacity-90">
                        <span className="size-1.5 rounded-full bg-success" />
                        已完成登記
                    </div>
                    <div className="relative flex flex-wrap items-end gap-6 md:gap-10">
                        <div>
                            <p className="text-xs opacity-60">今天搭乘</p>
                            <p className="mt-1.5 text-[clamp(22px,3.4vw,30px)] leading-tight font-bold tracking-tight">
                                {booked.route.name}
                            </p>
                        </div>
                        <div className="flex gap-7">
                            {booked.route.departAt && (
                                <div>
                                    <p className="text-[11px] opacity-60">發車</p>
                                    <p className="mt-1 font-mono text-2xl font-medium">{booked.route.departAt}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-[11px] opacity-60">座位</p>
                                <p className="mt-1 font-mono text-2xl font-medium text-accent">
                                    {booked.seatNumber}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="relative flex flex-wrap gap-2.5">
                        <Link
                            href="/profile"
                            className="rounded-field bg-accent px-5.5 py-3 text-sm font-medium text-ink"
                        >
                            顯示電子票
                        </Link>
                        <Link
                            href="/profile"
                            className="rounded-field border border-white/20 px-5 py-3 text-sm opacity-85"
                        >
                            取消登記
                        </Link>
                    </div>
                </div>
            ) : routes.length === 0 ? (
                <div className="flex flex-col items-center gap-2.5 rounded-card bg-surface p-10 text-center shadow-card">
                    <span className="size-13 rounded-2xl border border-dashed border-line bg-surface2" />
                    <p className="text-[19px] font-bold tracking-tight">今天沒有班次</p>
                    <p className="max-w-[30ch] text-sm leading-relaxed text-muted">
                        目前沒有開放的路線，請留意學校公告。
                    </p>
                    <Link
                        href="/routes"
                        className="mt-1.5 rounded-field border border-line px-4.5 py-2.5 text-sm"
                    >
                        看完整時刻表
                    </Link>
                </div>
            ) : (
                <div className="relative flex flex-col gap-5 overflow-hidden rounded-card bg-fg p-7 text-bg shadow-card-lg">
                    <div className="pointer-events-none absolute -right-18 -bottom-28 size-60 rounded-full bg-accent opacity-30 blur-sm" />
                    <div className="relative flex items-center gap-2 font-mono text-[11px] tracking-wide opacity-60 uppercase">
                        <span className="size-1.5 rounded-full bg-success" />
                        登記開放中
                    </div>
                    <div className="relative">
                        <p className="text-[clamp(24px,4vw,34px)] leading-tight font-bold tracking-tight">
                            今天還沒登記座位
                        </p>
                        <p className="mt-2.5 max-w-[34ch] text-sm leading-relaxed opacity-70">
                            {window_?.end
                                ? (
                                    <>
                                        距離截止還有{" "}
                                        <span className="font-mono">{formatCountdown(window_.end, now)}</span>。
                                    </>
                                  )
                                : "把握開放時間，先登記先選位。"}
                        </p>
                    </div>
                    <div className="relative flex flex-wrap gap-2.5">
                        <Link
                            href="/booking"
                            className="rounded-field bg-accent px-6.5 py-3.5 text-[15px] font-medium text-ink"
                        >
                            立即登記
                        </Link>
                        <Link
                            href="/routes"
                            className="rounded-field border border-white/20 px-5.5 py-3.5 text-[15px] opacity-85"
                        >
                            看路線
                        </Link>
                    </div>
                </div>
            )}

            {!loading && !error && routes.length > 0 && (
                <div>
                    <p className="mb-3 font-mono text-[11px] tracking-wide text-muted uppercase">今日班次</p>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {routes.map((route) => (
                            <Link
                                key={route.id}
                                href={`/booking?routeId=${route.id}`}
                                className="flex flex-col gap-1.5 rounded-field border border-line bg-surface px-4.5 py-4 transition hover:shadow-card"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-[15px] font-medium">{route.name}</span>
                                    {route.departAt && (
                                        <span className="font-mono text-[13px] text-muted">{route.departAt}</span>
                                    )}
                                </div>
                                <span className="text-xs text-muted">{route.stations.length} 個停靠站</span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {[
                    { label: "路線時刻", sub: "所有路線與停靠站", href: "/routes" },
                    { label: "我的票夾", sub: "電子票與個人資料", href: "/profile" },
                    { label: "使用說明", sub: "第一次登記看這裡", href: "/help" },
                ].map((q) => (
                    <Link
                        key={q.href}
                        href={q.href}
                        className="flex flex-col gap-1 rounded-field border border-line bg-surface2 px-4.5 py-4 transition hover:bg-surface hover:shadow-card"
                    >
                        <span className="text-sm font-medium">{q.label}</span>
                        <span className="text-xs text-muted">{q.sub}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
