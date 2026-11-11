"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/services/api";
import type { AdminBookingDto, BookingWindowDto, RouteDto } from "@/lib/types";
import { TOTAL_SEATS } from "@/lib/seat";

function toLocalInput(iso: string | null): string {
    if (!iso) return "";

    const date = new Date(iso);
    const pad = (value: number) => String(value).padStart(2, "0");

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface WaitlistEntrySummary {
    id: number;
    route: { name: string };
}

export default function AdminPage() {
    const [bookings, setBookings] = useState<AdminBookingDto[]>([]);
    const [waitlist, setWaitlist] = useState<WaitlistEntrySummary[]>([]);
    const [routes, setRoutes] = useState<RouteDto[]>([]);

    const [window_, setWindow] = useState<BookingWindowDto | null>(null);
    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");

    const [saving, setSaving] = useState(false);

    // Init data
    useEffect(() => {
        api<AdminBookingDto[]>("/api/admin/bookings").then(setBookings).catch(() => {});
        api<WaitlistEntrySummary[]>("/api/admin/waitlist").then(setWaitlist).catch(() => {});
        api<RouteDto[]>("/api/admin/routes").then(setRoutes).catch(() => {});
        api<BookingWindowDto>("/api/admin/booking-window")
            .then((data) => {
                setWindow(data);
                setStart(toLocalInput(data.start));
                setEnd(toLocalInput(data.end));
            })
            .catch(() => {});
    }, []);

    // Per-route seat usage（以路線清單為主，補上只出現在登記資料裡的路線名稱）
    const routeRows = useMemo(() => {
        const names = [
            ...new Set([...routes.map((r) => r.name), ...bookings.map((b) => b.route.name)]),
        ];

        return names.map((name) => {
            const count = bookings.filter((b) => b.route.name === name).length;
            const waiting = waitlist.filter((w) => w.route.name === name).length;
            const full = count >= TOTAL_SEATS || !!routes.find((r) => r.name === name)?.isFull;

            return { name, count, waiting, full };
        });
    }, [routes, bookings, waitlist]);

    const totalSeats = routeRows.length * TOTAL_SEATS;
    const remaining = Math.max(totalSeats - bookings.length, 0);

    const saveWindow = async () => {
        if (!start || !end) {
            alert("請填寫完整的開始與結束時間");
            return;
        }

        setSaving(true);

        try {
            const updated = await api<BookingWindowDto>("/api/admin/booking-window", {
                method: "PUT",
                body: { start: new Date(start).toISOString(), end: new Date(end).toISOString() },
            });
            setWindow(updated);
            alert("登記時間已更新");
        } catch (error) {
            alert(error instanceof ApiError ? error.message : "儲存失敗，請稍後再試");
        } finally {
            setSaving(false);
        }
    };

    const kpis = [
        { label: "已登記", value: bookings.length, unit: "人" },
        { label: "候補中", value: waitlist.length, unit: "人" },
        { label: "剩餘座位", value: remaining, unit: `座，共 ${totalSeats} 座` },
    ];

    return (
        <div className="flex flex-col gap-5 md:gap-7">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <h1 className="font-display text-[26px] leading-tight font-bold md:text-[32px]">登記概況</h1>
                {window_ && (
                    <span className="flex items-center gap-2.5 rounded-full border border-line px-4 py-2.5 text-sm">
                        {window_.open ? (
                            <>
                                <span aria-hidden="true" className="size-2.5 rounded-full border-2 border-fg" />
                                登記開放中
                            </>
                        ) : (
                            <>
                                <span aria-hidden="true" className="size-2.5 rounded-xs bg-faint" />
                                非登記時間
                            </>
                        )}
                    </span>
                )}
            </div>

            {/* Statistics */}
            <section
                aria-label="總覽"
                className="grid grid-cols-2 gap-2.5 md:grid-cols-[repeat(auto-fit,minmax(260px,1fr))] md:gap-4"
            >
                {kpis.map((stat, index) => (
                    <div
                        key={stat.label}
                        className={`flex flex-col gap-2.5 rounded-card border border-line p-5 md:p-6 ${
                            index === kpis.length - 1 ? "max-md:col-span-2" : ""
                        }`}
                    >
                        <span className="text-[15px] text-muted">{stat.label}</span>
                        <span className="flex flex-wrap items-baseline gap-1.5">
                            <span className="text-[44px] leading-none font-semibold tracking-[-0.02em] md:text-[52px]">
                                {stat.value}
                            </span>
                            <span className="text-[15px] text-muted">{stat.unit}</span>
                        </span>
                    </div>
                ))}
            </section>

            {/* Per-route seats */}
            <section className="flex flex-col rounded-card border border-line px-5 pt-5 pb-2 md:px-6 md:pt-6">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
                    <h2 className="text-lg font-bold">各路線座位</h2>
                    <ul aria-label="圖例" className="flex gap-4 text-[13px] text-fg2">
                        <li className="flex items-center gap-1.5">
                            <span aria-hidden="true" className="size-3 rounded-[3px] bg-[#8a8e96]" />
                            已登記
                        </li>
                        <li className="flex items-center gap-1.5">
                            <span aria-hidden="true" className="size-3 rounded-[3px] border-[1.5px] border-[#d5d8dd]" />
                            空位
                        </li>
                        <li className="flex items-center gap-1.5">
                            <span aria-hidden="true" className="size-3 rounded-[3px] bg-accent" />
                            已滿
                        </li>
                    </ul>
                </div>

                {routeRows.length === 0 && (
                    <p className="border-t border-line-soft py-8 text-center text-muted">目前沒有路線資料。</p>
                )}

                {routeRows.map((row) => (
                    <div
                        key={row.name}
                        className="flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-line-soft py-4.5"
                    >
                        <div className="flex flex-1 flex-col gap-0.5 md:w-45 md:flex-none">
                            <span className="text-[17px] font-bold">{row.name}</span>
                            <span className={`text-sm ${row.full ? "text-accent" : "text-muted"}`}>
                                {row.full
                                    ? `已滿，候補 ${row.waiting} 人`
                                    : `剩 ${Math.max(TOTAL_SEATS - row.count, 0)} 座`}
                            </span>
                        </div>

                        <span className="flex-none text-[22px] font-semibold md:order-last">
                            {row.count}
                            <span className="text-[15px] font-normal text-muted"> / {TOTAL_SEATS}</span>
                        </span>

                        <div
                            aria-hidden="true"
                            className="grid w-full grid-cols-[repeat(21,minmax(0,14px))] gap-[5px] md:w-auto md:flex-1"
                        >
                            {Array.from({ length: TOTAL_SEATS }, (_, i) => (
                                <span
                                    key={i}
                                    className={`aspect-square rounded-[3px] ${
                                        i < row.count
                                            ? row.full
                                                ? "bg-accent"
                                                : "bg-[#8a8e96]"
                                            : "border-[1.5px] border-[#d5d8dd]"
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </section>

            {/* Open Time */}
            <section className="relative flex flex-col gap-4.5 overflow-hidden rounded-card bg-surface2 p-5 md:p-6">
                <span
                    aria-hidden="true"
                    className="absolute -right-px -bottom-px size-27.5 rounded-tl-full bg-line"
                />
                <div className="relative flex flex-col gap-1">
                    <h2 className="text-lg font-bold">登記開放時間</h2>
                    <p className="text-sm text-muted">學生只能在這段時間內登記或取消座位。</p>
                </div>
                <div className="relative flex flex-wrap items-end gap-4">
                    {/* Start */}
                    <label className="flex flex-col gap-1.5 text-sm font-medium max-md:w-full">
                        開始
                        <input
                            type="datetime-local"
                            value={start}
                            onChange={(event) => setStart(event.target.value)}
                            className="h-12 rounded-[14px] border-[1.5px] border-[#d5d8dd] bg-surface px-3.5 text-[15px] font-normal text-fg outline-none focus:border-fg"
                        />
                    </label>

                    {/* End */}
                    <label className="flex flex-col gap-1.5 text-sm font-medium max-md:w-full">
                        結束
                        <input
                            type="datetime-local"
                            value={end}
                            onChange={(event) => setEnd(event.target.value)}
                            className="h-12 rounded-[14px] border-[1.5px] border-[#d5d8dd] bg-surface px-3.5 text-[15px] font-normal text-fg outline-none focus:border-fg"
                        />
                    </label>

                    {/* Save */}
                    <button
                        type="button"
                        onClick={saveWindow}
                        disabled={saving}
                        className="h-12 rounded-full bg-fg px-7 text-[15px] font-medium text-ink transition disabled:opacity-40 max-md:w-full"
                    >
                        {saving ? "儲存中…" : "儲存開放時間"}
                    </button>
                </div>
            </section>
        </div>
    );
}
