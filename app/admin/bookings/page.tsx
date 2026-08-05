"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/services/api";
import type { AdminBookingDto } from "@/lib/types";
import { ActionMenu } from "@/components";
import { annualPrice, formatPrice } from "@/lib/pricing";

function PaidBadge({ paid }: { paid: boolean }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                paid ? "bg-success-wash text-success-ink" : "bg-warning-wash text-warning-ink"
            }`}
        >
            <span className="size-1.5 rounded-full bg-current" />
            {paid ? "已繳費" : "未繳費"}
        </span>
    );
}

export default function AdminBookingsPage() {
    const [bookings, setBookings] = useState<AdminBookingDto[]>([]);
    const [pendingId, setPendingId] = useState<number | null>(null);

    const [routeFilter, setRouteFilter] = useState("all");
    const [keyword, setKeyword] = useState("");

    useEffect(() => {
        api<AdminBookingDto[]>("/api/admin/bookings").then(setBookings).catch(() => {});
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
        [bookings, routeFilter, keyword],
    );

    const markPaid = async (booking: AdminBookingDto) => {
        setPendingId(booking.id);
        try {
            await api(`/api/admin/bookings/${booking.id}`, {
                method: "PATCH",
                body: { isPaid: true },
            });
            setBookings((previous) =>
                previous.map((b) => (b.id === booking.id ? { ...b, isPaid: true } : b)),
            );
        } catch (error) {
            alert(error instanceof ApiError ? error.message : "更新繳費狀態失敗，請稍後再試");
        } finally {
            setPendingId(null);
        }
    };

    const deleteBooking = async (booking: AdminBookingDto) => {
        if (
            !window.confirm(
                `確定要刪除「${booking.student.name}」（${booking.route.name} / ${booking.seatNumber} 號座）的這筆登記嗎？此動作無法復原。`,
            )
        ) {
            return;
        }
        setPendingId(booking.id);
        try {
            await api(`/api/admin/bookings/${booking.id}`, { method: "DELETE" });
            setBookings((previous) => previous.filter((b) => b.id !== booking.id));
        } catch (error) {
            alert(error instanceof ApiError ? error.message : "刪除失敗，請稍後再試");
        } finally {
            setPendingId(null);
        }
    };

    return (
        <div className="flex flex-col gap-5.5">
            <h1 className="mt-2 text-[clamp(24px,3vw,32px)] font-bold tracking-tight">登記總覽</h1>

            {/* Search & Filters */}
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
                        className="rounded-field border border-line bg-surface2 px-3.5 py-2.5 outline-none focus:border-accent"
                    >
                        <option value="all">全部路線</option>
                        {routeNames.map((name) => (
                            <option key={name} value={name}>
                                {name}
                            </option>
                        ))}
                    </select>

                    <span className="ml-auto font-bold font-mono text-muted">共 {filtered.length} 筆</span>
                </div>
            </section>

            {/* Table */}
            <section className="rounded-card bg-surface p-6 shadow-card">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-left text-sm">
                        <thead>
                            <tr className="border-b border-line text-lg tracking-wide text-muted uppercase">
                                <th className="py-3 pr-4 font-medium">學號</th>
                                <th className="py-3 pr-4 font-medium">姓名</th>
                                <th className="py-3 pr-4 font-medium">路線</th>
                                <th className="py-3 pr-4 font-medium">站點</th>
                                <th className="py-3 pr-4 font-medium">座位</th>
                                <th className="py-3 pr-4 font-medium">應繳金額</th>
                                <th className="py-3 pr-4 font-medium">是否繳清</th>
                                <th className="py-3 pr-4 font-medium">登記時間</th>
                                <th className="py-3 font-medium" />
                            </tr>
                        </thead>

                        <tbody>
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="py-10 text-center text-muted">
                                        沒有符合條件的登記紀錄。
                                    </td>
                                </tr>
                            )}

                            {filtered.map((booking, i) => {
                                const station = booking.route.stations.find(
                                    (s) => s.name === booking.station,
                                );
                                const amount = annualPrice(station?.monthlyPrice ?? 0);

                                return (
                                    <tr
                                        key={booking.id}
                                        className={`border-b border-line last:border-0 ${i % 2 ? "bg-[#f1f1ee]" : ""}`}
                                    >
                                        <td className="py-3 pr-4 font-mono font-medium">
                                            {booking.student.studentId}
                                        </td>
                                        <td className="py-3 pr-4">{booking.student.name}</td>
                                        <td className="py-3 pr-4 text-muted">{booking.route.name}</td>
                                        <td className="py-3 pr-4 text-muted">{booking.station}</td>
                                        <td className="py-3 pr-4 font-mono font-medium">{booking.seatNumber}</td>
                                        <td className="py-3 pr-4 font-mono font-medium">
                                            {formatPrice(amount)}/年
                                        </td>
                                        <td className="py-3 pr-4">
                                            <PaidBadge paid={booking.isPaid} />
                                        </td>
                                        <td className="py-3 pr-4 font-mono text-muted">
                                            {new Date(booking.createdAt).toLocaleString("zh-TW", { hour12: false })}
                                        </td>
                                        <td className="py-3 text-right">
                                            <ActionMenu
                                                items={[
                                                    {
                                                        label: "標記已繳清",
                                                        disabled: booking.isPaid || pendingId === booking.id,
                                                        onSelect: () => void markPaid(booking),
                                                    },
                                                    {
                                                        label: "刪除這筆資料",
                                                        danger: true,
                                                        disabled: pendingId === booking.id,
                                                        onSelect: () => void deleteBooking(booking),
                                                    },
                                                ]}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
