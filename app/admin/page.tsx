"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api, ApiError } from "@/services/api";
import type { AdminBookingDto, BookingWindowDto } from "@/lib/types";
import { AppShell } from "@/components/AppShell";
import { NotFoundCard } from "@/components/NotFoundCard";
import { StatusChip } from "@/components/StatusChip";

function toLocalInput(iso: string | null): string {
    if (!iso) {
        return "";
    }
    const date = new Date(iso);
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminPage() {
    const { user, status, logout } = useAuth({ admin: true });
    const [bookings, setBookings] = useState<AdminBookingDto[]>([]);
    const [window_, setWindow] = useState<BookingWindowDto | null>(null);
    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);

    const [routeFilter, setRouteFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [keyword, setKeyword] = useState("");

    useEffect(() => {
        if (status !== "ready") {
            return;
        }
        api<AdminBookingDto[]>("/api/admin/bookings").then(setBookings).catch(() => {});
        api<BookingWindowDto>("/api/booking-window")
            .then((data) => {
                setWindow(data);
                setStart(toLocalInput(data.start));
                setEnd(toLocalInput(data.end));
            })
            .catch(() => {});
    }, [status]);

    const routeNames = useMemo(
        () => [...new Set(bookings.map((booking) => booking.schedule.route.name))],
        [bookings],
    );

    const filtered = useMemo(
        () =>
            bookings.filter((booking) => {
                if (routeFilter !== "all" && booking.schedule.route.name !== routeFilter) {
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
            setNotice("請填寫完整的開始與結束時間");
            return;
        }
        setSaving(true);
        setNotice(null);
        try {
            const updated = await api<BookingWindowDto>("/api/admin/booking-window", {
                method: "PUT",
                body: { start: new Date(start).toISOString(), end: new Date(end).toISOString() },
            });
            setWindow(updated);
            setNotice("登記時間已更新");
        } catch (error) {
            setNotice(error instanceof ApiError ? error.message : "儲存失敗，請稍後再試");
        } finally {
            setSaving(false);
        }
    };

    if (status === "denied") {
        return <NotFoundCard />;
    }
    if (status !== "ready" || !user) {
        return null;
    }

    return (
        <AppShell user={user} onLogout={logout}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">登記總覽</h1>
                    <p className="mt-1.5 text-sm text-muted">所有專車登記紀錄與登記時間管理。</p>
                </div>
                {window_ && <StatusChip status={window_.open ? "OPEN" : "CLOSED"} />}
            </div>

            {/* 統計 */}
            <section className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-4">
                {[
                    { label: "有效登記", value: successCount },
                    { label: "已取消", value: bookings.length - successCount },
                    ...routeNames.map((name) => ({
                        label: name,
                        value: bookings.filter(
                            (booking) =>
                                booking.schedule.route.name === name &&
                                booking.status === "SUCCESS",
                        ).length,
                    })),
                ].map((stat) => (
                    <div key={stat.label} className="rounded-3xl border border-line bg-surface p-5">
                        <p className="text-xs font-medium text-muted">{stat.label}</p>
                        <p className="mt-1.5 text-2xl font-bold">{stat.value}</p>
                    </div>
                ))}
            </section>

            {/* 登記時間設定 */}
            <section className="mt-7 rounded-3xl border border-line bg-surface p-6">
                <h2 className="text-sm font-semibold text-muted">登記開放時間</h2>
                <div className="mt-4 flex flex-wrap items-end gap-3">
                    <label className="text-xs font-medium text-muted">
                        開始
                        <input
                            type="datetime-local"
                            value={start}
                            onChange={(event) => setStart(event.target.value)}
                            className="mt-1.5 block rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-fg outline-none focus:border-accent"
                        />
                    </label>
                    <label className="text-xs font-medium text-muted">
                        結束
                        <input
                            type="datetime-local"
                            value={end}
                            onChange={(event) => setEnd(event.target.value)}
                            className="mt-1.5 block rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-fg outline-none focus:border-accent"
                        />
                    </label>
                    <button
                        type="button"
                        onClick={saveWindow}
                        disabled={saving}
                        className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                    >
                        {saving ? "儲存中…" : "儲存"}
                    </button>
                    {notice && <p className="text-sm text-accent-ink">{notice}</p>}
                </div>
            </section>

            {/* 篩選 + 清單 */}
            <section className="mt-7 rounded-3xl border border-line bg-surface p-6">
                <div className="flex flex-wrap items-center gap-3">
                    <input
                        type="search"
                        placeholder="搜尋學號或姓名…"
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                        className="w-56 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-accent"
                    />
                    <select
                        value={routeFilter}
                        onChange={(event) => setRouteFilter(event.target.value)}
                        className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-accent"
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
                        className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-accent"
                    >
                        <option value="all">全部狀態</option>
                        <option value="SUCCESS">登記成功</option>
                        <option value="CANCELLED">已取消</option>
                    </select>
                    <span className="ml-auto text-xs text-muted">共 {filtered.length} 筆</span>
                </div>

                <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                        <thead>
                            <tr className="border-b border-line text-xs text-muted">
                                <th className="py-3 pr-4 font-medium">學號</th>
                                <th className="py-3 pr-4 font-medium">姓名</th>
                                <th className="py-3 pr-4 font-medium">路線／班次</th>
                                <th className="py-3 pr-4 font-medium">座位</th>
                                <th className="py-3 pr-4 font-medium">狀態</th>
                                <th className="py-3 font-medium">登記時間</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-10 text-center text-muted">
                                        沒有符合條件的登記紀錄。
                                    </td>
                                </tr>
                            )}
                            {filtered.map((booking) => (
                                <tr key={booking.id} className="border-b border-line last:border-0">
                                    <td className="py-3 pr-4 font-semibold">
                                        {booking.student.studentId}
                                    </td>
                                    <td className="py-3 pr-4">{booking.student.name}</td>
                                    <td className="py-3 pr-4">
                                        {booking.schedule.route.name}・{booking.schedule.label}
                                    </td>
                                    <td className="py-3 pr-4 font-semibold">
                                        {booking.seatNumber} 號
                                    </td>
                                    <td className="py-3 pr-4">
                                        <StatusChip status={booking.status} />
                                    </td>
                                    <td className="py-3 text-xs text-muted">
                                        {new Date(booking.createdAt).toLocaleString("zh-TW")}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </AppShell>
    );
}
