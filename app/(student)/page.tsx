"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useCurrentUser } from "@/hooks/useAuth";
import { api, ApiError } from "@/services/api";
import { Ticket } from "@/components";
import { BusIcon } from "@/components/icons";
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
    /*
        - user: 目前登入的使用者資訊
        - me: 從 /api/student/me 取得的使用者資訊，包含是否已登記
        - window_: 從 /api/student/booking-window 取得的登記開放時間資訊
        - routes: 從 /api/student/routes 取得的可登記路線資訊

        - loading: 是否正在載入資料
        - error: 是否載入資料時發生錯誤

        - now: 當前時間，用於計算倒數時間

        - cancelling: 是否正在取消登記
        - cancelOpen: 是否顯示取消確認視窗
    */
    const { user } = useCurrentUser();
    const [me, setMe] = useState<MeResponse | null>(null);
    const [window_, setWindow] = useState<BookingWindowDto | null>(null);
    const [routes, setRoutes] = useState<RouteDto[]>([]);

    const [now, setNow] = useState(() => Date.now());

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const [cancelling, setCancelling] = useState(false);
    const [cancelOpen, setCancelOpen] = useState(false);

    const loadData = () => {
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

    // Init load
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- 掛載即抓資料，既有寫法
        loadData();
    }, []);

    // Every 30 seconds, update the current time to refresh countdowns
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 30_000);
        return () => clearInterval(t);
    }, []);

    const booked = me?.booking ?? null;
    const info = me?.user;
    const rows = [
        { k: "姓名", v: info?.name ?? user.name, mono: false },
        { k: "學號", v: info?.studentId ?? user.sub, mono: true },
        { k: "入學學年", v: (info?.enrollmentYear ?? user.enrollmentYear) || "—", mono: false },
    ];

    // Cancel booking
    const handleCancel = async () => {
        if (!booked) {
            return;
        }

        setCancelling(true);

        try {
            await api(`/api/student/bookings/${booked.id}`, { method: "DELETE" });
            setCancelOpen(false);
            loadData();
        } catch (err) {
            alert(err instanceof ApiError ? err.message : "取消失敗，請稍後再試");
        } finally {
            setCancelling(false);
        }
    };

    return (
        <div className="flex flex-col gap-5.5">
            {/* Header with greeting and date */}
            <div>
                <p className="font-mono text-sm tracking-wide text-muted">{todayLabel()}</p>
                <h1 className="mt-2 text-[clamp(24px,3.4vw,32px)] leading-tight font-bold tracking-tight">
                    {greeting()}，{user.name}！
                </h1>
            </div>

            {
                loading ? (
                    // Loading card
                    <div className="flex flex-col gap-3.5 rounded-card bg-surface p-6.5 shadow-card">
                        <div className="h-3 w-24 animate-pulse rounded bg-line" />
                        <div className="h-7 w-3/5 animate-pulse rounded-lg bg-line" />
                        <div className="h-11 animate-pulse rounded-field bg-line" />
                    </div>
                ) : error ? (
                    // Error card
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
                            onClick={loadData}
                            className="rounded-field bg-fg px-5 py-2.5 text-sm font-medium text-bg"
                        >
                            重新載入
                        </button>
                    </div>
                ) : booked ? (
                    // For students who have already booked a seat
                    <div className="flex flex-col items-center gap-4">
                        <Ticket booking={booked} rows={rows} />

                        {/* Cancel booking button */}
                        <div className="flex w-full max-w-md items-center justify-between gap-3 rounded-card bg-surface p-4.5 shadow-card">
                            <span className="text-xs text-muted">開放時間內可以取消</span>
                            <button
                                type="button"
                                onClick={() => setCancelOpen(true)}
                                className="rounded-field bg-danger px-3.5 py-2 text-[12.5px] font-medium text-white transition hover:opacity-90"
                            >
                                取消登記
                            </button>
                        </div>
                    </div>
                ) : (
                    // For students who have not booked a seat yet
                    <>
                        {!window_?.open ? (
                            // Not In the booking time
                            <div className="flex flex-col gap-4 rounded-card bg-surface p-7 shadow-card">
                                {/* Status label */}
                                <div className="flex items-center gap-2 font-mono text-[11px] tracking-wide text-muted uppercase">
                                    <span className="size-1.5 rounded-full bg-warning" />
                                    非登記時間
                                </div>

                                {/* Status message */}
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

                                <Link
                                    href="/routes"
                                    className="w-fit rounded-field border border-line px-5.5 py-3"
                                >
                                    看路線
                                </Link>
                                
                            </div>
                        ) : routes.length === 0 ? (
                            // No routes available
                            <div className="flex flex-col items-center gap-2.5 rounded-card bg-surface p-10 text-center shadow-card">
                                <span className="grid size-13 place-items-center rounded-2xl border border-dashed border-line bg-surface2">
                                    <BusIcon className="size-8" />
                                </span>
                                <p className="text-[24px] font-bold tracking-tight">沒有開放路線</p>
                                <p className="max-w-[30ch] text-sm leading-relaxed text-muted">
                                    目前沒有開放的路線，<br />
                                    請留意學校公告。
                                </p>
                            </div>
                        ) : (
                            // In the booking time and routes are available
                            <div className="relative flex flex-col gap-5 overflow-hidden rounded-card border border-line bg-surface p-7 shadow-card">
                                {/* Status label */}
                                <div className="relative flex items-center gap-2 font-mono text-[11px] tracking-wide text-muted uppercase">
                                    <span className="size-1.5 rounded-full bg-success" />
                                    登記開放中
                                </div>

                                {/* Status message */}
                                <div className="relative">
                                    <p className="text-[clamp(24px,4vw,34px)] leading-tight font-bold tracking-tight">
                                        還沒登記座位
                                    </p>

                                    <p className="mt-2.5 max-w-[34ch] text-sm leading-relaxed text-muted">
                                        {window_?.end ? (
                                            <>
                                                距離截止還有{" "}
                                                <span className="font-mono text-fg">
                                                    {formatCountdown(window_.end, now)}
                                                </span>
                                                。
                                            </>
                                        ) : (
                                            "把握開放時間，先登記先選位。"
                                        )}
                                    </p>
                                </div>

                                {/* Action buttons */}
                                <div className="relative flex flex-wrap gap-2.5">
                                    <Link
                                        href="/booking"
                                        className="rounded-field bg-fg px-6.5 py-3.5 font-medium text-bg"
                                    >
                                        立即登記
                                    </Link>
                                    <Link
                                        href="/routes"
                                        className="rounded-field border border-line px-5.5 py-3.5"
                                    >
                                        看路線
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* Help link */}
                        <Link
                            href="/help"
                            className="flex w-full items-center justify-between gap-3 rounded-field border border-line bg-surface2 px-5 py-4 transition hover:bg-surface hover:shadow-card sm:max-w-xs"
                        >
                            <div className="flex flex-col gap-1">
                                <span className="font-medium">使用說明</span>
                                <span className="text-sm text-muted">第一次登記看這裡</span>
                            </div>
                            <span className="text-muted text-xl">→</span>
                        </Link>

                        <div className="flex flex-col items-center gap-4">
                            <Ticket booking={null} rows={rows} />
                        </div>

                    </>
                )
            }

            {/* Cancel confirmation modal */}
            {cancelOpen && (
                <div
                    onClick={() => !cancelling && setCancelOpen(false)}
                    className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[3px]"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex w-full max-w-md flex-col gap-4 rounded-t-card bg-surface px-6 pt-5.5 pb-7.5 shadow-card-lg"
                    >   
                        {/* Decorative element */}
                        <div className="mx-auto h-1 w-9 rounded-full bg-line" />

                        {/* Confirmation message */}
                        <div>
                            <p className="text-[19px] font-bold tracking-tight">要放掉這個位子嗎？</p>
                            <p className="mt-2 text-sm leading-relaxed text-muted">
                                取消後座位會馬上開放給其他同學，開放時間內你還是可以重新登記。
                            </p>
                        </div>

                        <div className="flex flex-col gap-2.5">
                            {/* Cancel buttons */}
                            <button
                                type="button"
                                disabled={cancelling}
                                onClick={handleCancel}
                                className="rounded-field border border-line py-3.5 font-medium text-danger-ink transition hover:border-danger hover:bg-danger-wash disabled:opacity-50"
                            >
                                {cancelling ? "取消中…" : "確定取消登記"}
                            </button>

                            {/* Keep button */}
                            <button
                                type="button"
                                disabled={cancelling}
                                onClick={() => setCancelOpen(false)}
                                className="rounded-field bg-fg py-3.5 font-medium text-bg disabled:opacity-50"
                            >
                                先留著
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
