"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useCurrentUser } from "@/hooks/useAuth";
import { api, ApiError } from "@/services/api";
import { Ticket } from "@/components";
import { ArrowRightIcon } from "@/components/icons";
import type { BookingDto, MeResponse, BookingWindowDto, RouteDto } from "@/lib/types";

const pad = (value: number) => String(value).padStart(2, "0");

function greeting(): string {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 11) return "早安";
    if (hour >= 11 && hour < 18) return "午安";
    return "晚安";
}

function todayLabel(): string {
    const d = new Date();
    const week = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
    return `${d.getMonth() + 1} 月 ${d.getDate()} 日 星期${week}`;
}

function formatDateTime(iso: string): string {
    const d = new Date(iso);
    return `${d.getMonth() + 1} 月 ${d.getDate()} 日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatCountdown(endIso: string, now: number): string {
    let ms = new Date(endIso).getTime() - now;
    if (ms < 0) ms = 0;

    const days = Math.floor(ms / 86_400_000);
    const hours = Math.floor((ms % 86_400_000) / 3_600_000);
    const minutes = Math.floor((ms % 3_600_000) / 60_000);

    if (days > 0) return `${days} 天 ${hours} 小時`;
    if (hours > 0) return `${hours} 小時 ${pad(minutes)} 分`;
    return `${minutes} 分`;
}

interface InfoRow {
    k: string;
    v: string;
}

// 右側欄：我的資料
function ProfileCard({ rows }: { rows: InfoRow[] }) {
    return (
        <section className="flex flex-col gap-3.5 rounded-card border border-line p-6">
            <h2 className="text-[17px] font-bold">我的資料</h2>
            <dl className="flex flex-col">
                {rows.map((row, index) => (
                    <div
                        key={row.k}
                        className={`flex justify-between gap-3 py-2.5 ${
                            index < rows.length - 1 ? "border-b border-line-soft" : ""
                        }`}
                    >
                        <dt className="text-[15px] text-muted">{row.k}</dt>
                        <dd className="text-right text-[15px] font-medium break-all">{row.v}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

// 右側欄：已登記路線的停靠站時間軸
function StopsCard({ booking }: { booking: BookingDto }) {
    const stations = booking.route.stations;

    if (stations.length === 0) return null;

    return (
        <section className="flex flex-col gap-4.5 rounded-card border border-line p-6">
            <h2 className="text-[17px] font-bold">{booking.route.name}停靠站</h2>
            <ol className="flex flex-col">
                {stations.map((station, index) => {
                    const mine = station.name === booking.station;
                    const last = index === stations.length - 1;

                    return (
                        <li
                            key={station.name}
                            className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-start gap-x-3.5"
                        >
                            <span aria-hidden="true" className="relative flex justify-center self-stretch">
                                {!last && <span className="absolute inset-y-0 w-0.5 bg-line" />}
                                <span
                                    className={`relative mt-1 rounded-full border-2 ${
                                        mine
                                            ? "size-4 border-accent bg-accent"
                                            : "size-3 border-fg bg-surface"
                                    }`}
                                />
                            </span>
                            <span className={`flex flex-col gap-0.5 ${last ? "" : "pb-4.5"}`}>
                                <span className={`text-[15px] ${mine ? "font-bold" : ""}`}>{station.name}</span>
                                {mine && <span className="text-[13px] text-accent">你在這站上車</span>}
                            </span>
                            <span className="text-[15px] text-fg2">{station.arriveAt}</span>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}

// 尚未登記時的空白車票預覽
function TicketPreview({ note }: { note: string }) {
    return (
        <div aria-label="電子車票預覽" className="flex flex-col gap-3">
            <div
                aria-hidden="true"
                className="flex overflow-hidden rounded-3xl border-2 border-dashed border-line"
            >
                <div className="flex min-w-0 flex-1 flex-col gap-5.5 p-6 md:p-8">
                    <span className="h-3 w-30 rounded-full bg-line-soft" />
                    <span className="h-8.5 w-full max-w-50 rounded-[10px] bg-surface2" />
                    <span className="grid grid-cols-2 gap-4">
                        <span className="h-11 rounded-[10px] bg-surface2" />
                        <span className="h-11 rounded-[10px] bg-surface2" />
                    </span>
                </div>
                <div className="my-6 w-0 border-l-2 border-dashed border-line" />
                <div className="flex shrink-0 items-center justify-center px-5 py-6 md:w-[220px] md:px-6 md:py-8">
                    <span className="grid size-20 place-items-center rounded-full border-2 border-dashed border-line-strong text-3xl font-semibold text-faint md:size-28 md:text-[40px]">
                        ?
                    </span>
                </div>
            </div>
            <p className="text-sm text-muted">{note}</p>
        </div>
    );
}

export default function HomePage() {
    /*
        - user: 目前登入的使用者資訊
        - me: 從 /api/student/me 取得的使用者資訊，包含是否已登記
        - window_: 從 /api/student/booking-window 取得的登記開放時間資訊
        - routes: 從 /api/public/routes 取得的可登記路線資訊

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
            api<RouteDto[]>("/api/public/routes"),
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
    const rows: InfoRow[] = [
        { k: "姓名", v: info?.name ?? user.name },
        { k: "學號", v: info?.studentId ?? user.sub },
        { k: "入學學年", v: (info?.enrollmentYear ?? user.enrollmentYear) || "—" },
    ];

    const isOpen = !!window_?.open;

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
        <div className="flex flex-col gap-4.5 md:gap-8">
            {/* Header with greeting, date and booking-window status */}
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3.5">
                <div className="flex flex-col gap-1 md:gap-1.5">
                    <span className="text-sm text-muted md:text-[15px]">{todayLabel()}</span>
                    <h1 className="font-display text-[26px] leading-[1.3] font-bold md:text-[34px] md:leading-tight">
                        {greeting()}，{user.name}
                    </h1>
                </div>

                {!loading && !error && window_ && (
                    <span className="flex items-center gap-2 rounded-full border border-line px-3.5 py-2 text-[13px] md:gap-2.5 md:px-4 md:py-2.5 md:text-sm">
                        {isOpen ? (
                            <>
                                <span aria-hidden="true" className="size-2.5 rounded-full border-2 border-fg" />
                                登記開放中{window_.end ? `，${formatDateTime(window_.end)} 截止` : ""}
                            </>
                        ) : (
                            <>
                                <span aria-hidden="true" className="size-2.5 rounded-xs bg-faint" />
                                目前不在登記時間
                            </>
                        )}
                    </span>
                )}
            </div>

            {loading ? (
                // Loading card
                <div className="flex flex-col gap-3.5 rounded-3xl border border-line p-8">
                    <div className="h-3 w-24 animate-pulse rounded-full bg-line" />
                    <div className="h-9 w-3/5 animate-pulse rounded-[10px] bg-surface2" />
                    <div className="h-11 animate-pulse rounded-[10px] bg-surface2" />
                </div>
            ) : error ? (
                // Error card
                <div className="flex flex-col items-start gap-4 rounded-3xl border border-line p-8">
                    <span className="grid size-11 place-items-center rounded-full bg-accent text-xl font-semibold text-ink">
                        !
                    </span>

                    <div className="flex flex-col gap-1.5">
                        <p className="font-display text-2xl font-bold">連不上伺服器</p>
                        <p className="leading-relaxed text-muted">先確認一下網路，或稍等幾秒再試一次。</p>
                    </div>

                    <button
                        type="button"
                        onClick={loadData}
                        className="flex h-12 items-center rounded-full bg-fg px-7 font-medium text-ink"
                    >
                        重新載入
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-7">
                    {/* Left column */}
                    {booked ? (
                        // For students who have already booked a seat
                        <section aria-label="我的電子車票" className="flex min-w-0 flex-col gap-4 lg:flex-[2]">
                            <Ticket booking={booked} />

                            {/* Cancel booking */}
                            <div className="flex flex-col gap-4 rounded-[18px] bg-surface2 p-5 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-3 md:py-4">
                                <p className="flex flex-col gap-1 md:block md:text-[15px] md:text-fg2">
                                    <span className="font-bold md:font-normal">想換位子？</span>
                                    <span className="text-sm leading-relaxed text-muted md:text-[15px] md:text-fg2">
                                        開放時間內可以先取消，再重新登記。
                                    </span>
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setCancelOpen(true)}
                                    className="h-12 w-full rounded-full border-[1.5px] border-accent bg-surface px-5 text-[15px] font-medium text-accent transition hover:bg-accent-wash md:h-auto md:min-h-11 md:w-auto"
                                >
                                    取消登記
                                </button>
                            </div>
                        </section>
                    ) : (
                        // For students who have not booked a seat yet
                        <section className="flex min-w-0 flex-col gap-4 lg:flex-[2]">
                            <div className="relative flex flex-col gap-5 overflow-hidden rounded-3xl border border-line p-6 md:gap-6.5 md:p-9">
                                {/* Decoration */}
                                <span
                                    aria-hidden="true"
                                    className="absolute -top-px -right-px size-28 rounded-bl-full bg-surface2 md:size-42"
                                />
                                {isOpen && routes.length > 0 ? (
                                    <span
                                        aria-hidden="true"
                                        className="absolute top-6 right-6 size-7 rounded-full bg-accent md:top-10 md:right-10 md:size-10"
                                    />
                                ) : (
                                    <span
                                        aria-hidden="true"
                                        className="absolute top-6 right-6 size-7 rounded-lg border-[3px] border-faint md:top-10 md:right-10 md:size-10"
                                    />
                                )}

                                {!isOpen ? (
                                    // Not in the booking time
                                    <>
                                        <div className="relative flex flex-col gap-2.5 pr-20 md:pr-32">
                                            <h2 className="font-display text-[26px] leading-tight font-bold md:text-[34px]">
                                                現在還不能登記
                                            </h2>
                                            <p className="text-[15px] leading-[1.7] text-muted md:text-[17px]">
                                                {window_?.start && window_?.end ? (
                                                    <>
                                                        開放時間：
                                                        <span className="font-semibold text-fg">
                                                            {formatDateTime(window_.start)} 至{" "}
                                                            {formatDateTime(window_.end)}
                                                        </span>
                                                        <br />
                                                        開放後回到這裡就能登記，可以先看看路線。
                                                    </>
                                                ) : (
                                                    "尚未公告登記時間，請留意學校公告。"
                                                )}
                                            </p>
                                        </div>
                                        <div className="relative flex flex-wrap gap-3">
                                            <Link
                                                href="/routes"
                                                className="flex h-14 items-center rounded-full bg-fg px-8 font-medium text-ink"
                                            >
                                                先看路線
                                            </Link>
                                        </div>
                                    </>
                                ) : routes.length === 0 ? (
                                    // No routes available
                                    <div className="relative flex flex-col gap-2.5 pr-20 md:pr-32">
                                        <h2 className="font-display text-[26px] leading-tight font-bold md:text-[34px]">
                                            沒有開放路線
                                        </h2>
                                        <p className="text-[15px] leading-[1.7] text-muted md:text-[17px]">
                                            目前沒有開放的路線，請留意學校公告。
                                        </p>
                                    </div>
                                ) : (
                                    // In the booking time and routes are available
                                    <>
                                        <div className="relative flex flex-col gap-2.5 pr-20 md:pr-32">
                                            <h2 className="font-display text-[26px] leading-tight font-bold md:text-[34px]">
                                                你還沒登記座位
                                            </h2>
                                            <p className="text-[15px] leading-[1.7] text-muted md:text-[17px]">
                                                {window_?.end ? (
                                                    <>
                                                        距離截止還有{" "}
                                                        <span className="font-semibold text-fg">
                                                            {formatCountdown(window_.end, now)}
                                                        </span>
                                                        ，先登記先選位。
                                                    </>
                                                ) : (
                                                    "把握開放時間，先登記先選位。"
                                                )}
                                            </p>
                                        </div>
                                        <div className="relative flex flex-wrap gap-3">
                                            <Link
                                                href="/booking"
                                                className="flex h-14 items-center rounded-full bg-fg px-8 font-medium text-ink"
                                            >
                                                開始登記
                                            </Link>
                                            <Link
                                                href="/routes"
                                                className="flex h-14 items-center rounded-full border-[1.5px] border-line px-7 font-medium transition hover:border-fg"
                                            >
                                                先看路線
                                            </Link>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Ticket preview */}
                            <TicketPreview
                                note={
                                    isOpen
                                        ? "完成登記後，你的電子車票會出現在這裡。"
                                        : "開放登記並完成後，你的電子車票會出現在這裡。"
                                }
                            />
                        </section>
                    )}

                    {/* Right column */}
                    <aside className="flex min-w-0 flex-col gap-5 lg:flex-1">
                        {booked ? (
                            <StopsCard booking={booked} />
                        ) : (
                            // Help link
                            <Link
                                href="/help"
                                className="flex items-center justify-between gap-3 rounded-card bg-surface2 px-6 py-5.5 transition hover:bg-line"
                            >
                                <span className="flex flex-col gap-1">
                                    <span className="text-[17px] font-bold">第一次登記？</span>
                                    <span className="text-sm text-muted">看使用說明，幾個步驟就完成</span>
                                </span>
                                <ArrowRightIcon className="size-5 shrink-0" />
                            </Link>
                        )}

                        <ProfileCard rows={rows} />
                    </aside>
                </div>
            )}

            {/* Cancel confirmation modal */}
            {cancelOpen && (
                <div
                    onClick={() => !cancelling && setCancelOpen(false)}
                    className="fixed inset-0 z-50 flex items-end justify-center bg-fg/30 md:items-center md:p-6"
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="cancel-title"
                        onClick={(e) => e.stopPropagation()}
                        className="relative flex w-full flex-col gap-5 overflow-hidden rounded-t-[28px] bg-surface px-6 pt-7 pb-8 shadow-card-lg max-md:animate-[sheet-up_240ms_ease-out] md:max-w-[420px] md:animate-[pop-in_180ms_ease-out] md:rounded-[28px] md:px-7 md:pt-8 md:pb-6"
                    >
                        <span
                            aria-hidden="true"
                            className="absolute -bottom-px -left-px size-24 rounded-tr-full bg-surface2"
                        />

                        {booked && (
                            <span className="relative grid size-18 place-items-center rounded-full bg-accent text-[32px] font-semibold text-ink">
                                {booked.seatNumber}
                            </span>
                        )}

                        {/* Confirmation message */}
                        <div className="relative flex flex-col gap-2">
                            <h2 id="cancel-title" className="text-[22px] font-bold">
                                要放掉這個位子嗎？
                            </h2>
                            <p className="text-[15px] leading-[1.7] text-fg2">
                                取消後座位會馬上釋出，開放時間內你還是可以重新登記。
                            </p>
                        </div>

                        {/* Waitlist warning */}
                        <p className="relative rounded-2xl bg-warning-wash px-4 py-3 text-sm leading-[1.7] text-warning-ink">
                            <span className="font-bold">注意：</span>
                            如果這條路線有人在候補，位子會直接補給候補的同學。之後想再登記可能已經沒有空位，只能重新排候補。
                        </p>

                        <div className="relative flex flex-col gap-2.5">
                            {/* Keep button */}
                            <button
                                type="button"
                                disabled={cancelling}
                                onClick={() => setCancelOpen(false)}
                                className="h-13.5 rounded-full bg-fg font-medium text-ink disabled:opacity-50"
                            >
                                先留著
                            </button>

                            {/* Cancel button */}
                            <button
                                type="button"
                                disabled={cancelling}
                                onClick={handleCancel}
                                className="h-13.5 rounded-full border-[1.5px] border-accent bg-surface font-medium text-accent transition hover:bg-accent-wash disabled:opacity-50"
                            >
                                {cancelling ? "取消中…" : "確定取消登記"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
