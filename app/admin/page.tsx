"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/services/api";
import type { AdminBookingDto, BookingWindowDto } from "@/lib/types";
import { StatusChip } from "@/components";

function toLocalInput(iso: string | null): string {
    if (!iso) {
        return "";
    }
    const date = new Date(iso);
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminPage() {
    const [bookings, setBookings] = useState<AdminBookingDto[]>([]);
    const [window_, setWindow] = useState<BookingWindowDto | null>(null);
    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");
    const [saving, setSaving] = useState(false);

    const [routeFilter, setRouteFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [keyword, setKeyword] = useState("");

    useEffect(() => {
        api<AdminBookingDto[]>("/api/admin/bookings").then(setBookings).catch(() => {});
        api<BookingWindowDto>("/api/admin/booking-window")
            .then((data) => {
                setWindow(data);
                setStart(toLocalInput(data.start));
                setEnd(toLocalInput(data.end));
            })
            .catch(() => {});
    }, []);

    const routeNames = useMemo(
        () => [...new Set(bookings.map((booking) => booking.route.name))],
        [bookings],
    );

    const filtered = useMemo(
        () =>
            bookings.filter((booking) => {
                if (routeFilter !== "all" && booking.route.name !== routeFilter) {
                    return false;
                }
                if (statusFilter !== "all" && booking.status !== statusFilter) {
                    return false;
                }
                const query = keyword.trim();
                if (
                    query &&
                    !booking.student.studentId.includes(query) &&
                    !booking.student.name.includes(query)
                ) {
                    return false;
                }
                return true;
            }),
        [bookings, routeFilter, statusFilter, keyword],
    );

    const successCount = bookings.filter((booking) => booking.status === "SUCCESS").length;

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
        { label: "有效登記", value: successCount, unit: "人" },
        { label: "已取消", value: bookings.length - successCount, unit: "人" },
        ...routeNames.map((name) => ({
            label: name,
            value: bookings.filter(
                (booking) => booking.route.name === name && booking.status === "SUCCESS",
            ).length,
            unit: "人",
        })),
    ];

    return (
        <div className="flex flex-col gap-5.5">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="font-mono text-[11px] tracking-wide text-muted uppercase">管理後台</p>
                    <h1 className="mt-2 text-[clamp(20px,3vw,26px)] font-bold tracking-tight">今日登記概況</h1>
                </div>
                {window_ && <StatusChip status={window_.open ? "OPEN" : "CLOSED"} />}
            </div>

            {/* 統計 */}
            <section className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                {kpis.map((stat) => (
                    <div key={stat.label} className="flex flex-col gap-2 rounded-field border border-line bg-surface p-4.5">
                        <p className="text-xs text-muted">{stat.label}</p>
                        <p className="flex items-baseline gap-1.5">
                            <span className="font-mono text-[26px] font-medium tracking-tight">{stat.value}</span>
                            <span className="font-mono text-xs text-muted">{stat.unit}</span>
                        </p>
                    </div>
                ))}
            </section>

            {/* 登記時間設定 */}
            <section className="rounded-card bg-surface p-6 shadow-card">
                <h2 className="text-sm font-semibold text-muted">登記開放時間</h2>
                <div className="mt-4 flex flex-wrap items-end gap-3">
                    <label className="text-xs font-medium text-muted">
                        開始
                        <input
                            type="datetime-local"
                            value={start}
                            onChange={(event) => setStart(event.target.value)}
                            className="mt-1.5 block rounded-field border border-line bg-surface2 px-3.5 py-2.5 font-mono text-sm text-fg outline-none focus:border-accent"
                        />
                    </label>
                    <label className="text-xs font-medium text-muted">
                        結束
                        <input
                            type="datetime-local"
                            value={end}
                            onChange={(event) => setEnd(event.target.value)}
                            className="mt-1.5 block rounded-field border border-line bg-surface2 px-3.5 py-2.5 font-mono text-sm text-fg outline-none focus:border-accent"
                        />
                    </label>
                    <button
                        type="button"
                        onClick={saveWindow}
                        disabled={saving}
                        className="rounded-field bg-fg px-5 py-2.5 text-sm font-medium text-bg transition disabled:opacity-40"
                    >
                        {saving ? "儲存中…" : "儲存"}
                    </button>
                </div>
            </section>

            {/* 篩選 + 清單 */}
            <section className="rounded-card bg-surface p-6 shadow-card">
                <div className="flex flex-wrap items-center gap-2.5">
                    <input
                        type="search"
                        placeholder="搜尋學號或姓名…"
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                        className="w-56 rounded-field border border-line bg-surface2 px-3.5 py-2.5 text-sm outline-none focus:border-accent"
                    />
                    <select
                        value={routeFilter}
                        onChange={(event) => setRouteFilter(event.target.value)}
                        className="rounded-field border border-line bg-surface2 px-3.5 py-2.5 text-sm outline-none focus:border-accent"
                    >
                        <option value="all">全部路線</option>
                        {routeNames.map((name) => (
                            <option key={name} value={name}>
                                {name}
                            </option>
                        ))}
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        className="rounded-field border border-line bg-surface2 px-3.5 py-2.5 text-sm outline-none focus:border-accent"
                    >
                        <option value="all">全部狀態</option>
                        <option value="SUCCESS">登記成功</option>
                        <option value="CANCELLED">已取消</option>
                    </select>
                    <span className="ml-auto font-mono text-xs text-muted">共 {filtered.length} 筆</span>
                </div>

                <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                        <thead>
                            <tr className="border-b border-line text-[10.5px] tracking-wide text-muted uppercase">
                                <th className="py-3 pr-4 font-medium">學號</th>
                                <th className="py-3 pr-4 font-medium">姓名</th>
                                <th className="py-3 pr-4 font-medium">路線</th>
                                <th className="py-3 pr-4 font-medium">站點</th>
                                <th className="py-3 pr-4 font-medium">座位</th>
                                <th className="py-3 pr-4 font-medium">狀態</th>
                                <th className="py-3 font-medium">登記時間</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-10 text-center text-muted">
                                        沒有符合條件的登記紀錄。
                                    </td>
                                </tr>
                            )}
                            {filtered.map((booking, i) => (
                                <tr
                                    key={booking.id}
                                    className={`border-b border-line last:border-0 ${i % 2 ? "bg-surface2" : ""}`}
                                >
                                    <td className="py-3 pr-4 font-mono font-medium">
                                        {booking.student.studentId}
                                    </td>
                                    <td className="py-3 pr-4">{booking.student.name}</td>
                                    <td className="py-3 pr-4 text-muted">{booking.route.name}</td>
                                    <td className="py-3 pr-4 text-muted">{booking.station}</td>
                                    <td className="py-3 pr-4 font-mono font-medium">{booking.seatNumber}</td>
                                    <td className="py-3 pr-4">
                                        <StatusChip status={booking.status} />
                                    </td>
                                    <td className="py-3 font-mono text-xs text-muted">
                                        {new Date(booking.createdAt).toLocaleString("zh-TW", { hour12: false })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
