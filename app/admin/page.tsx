"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/services/api";
import type { AdminBookingDto, BookingWindowDto, RouteDto } from "@/lib/types";
import { StatusChip } from "@/components";

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

    // Each router count
    const routeNames = useMemo(
        () => [...new Set(bookings.map((booking) => booking.route.name))],
        [bookings],
    );

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
        { label: "總登記數", value: bookings.length, unit: "人" },
        { label: "候補中", value: waitlist.length, unit: "人" },
        ...routeNames.map((name) => ({
            label: name + (routes.find((r) => r.name === name)?.isFull ? "（已滿）" : ""),
            value: bookings.filter((booking) => booking.route.name === name).length,
            unit: "人",
        })),
    ];

    return (
        <div className="flex flex-col gap-5.5">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <h1 className="mt-2 text-[clamp(24px,3vw,32px)] font-bold tracking-tight">登記概況</h1>
                {window_ && <StatusChip status={window_.open ? "OPEN" : "CLOSED"} />}
            </div>

            {/* Statistics */}
            <section className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                {kpis.map((stat) => (
                    <div key={stat.label} className="rounded-card bg-surface p-6 shadow-card">
                        <p className="text-muted text-lg">{stat.label}</p>
                        <p className="flex items-baseline gap-1.5">
                            <span className="font-mono text-[32px] font-medium tracking-tight">{stat.value}</span>
                            <span className="font-mono text-xs text-muted">{stat.unit}</span>
                        </p>
                    </div>
                ))}
            </section>

            {/* Open Time */}
            <section className="rounded-card bg-surface p-6 shadow-card">
                <h2 className="font-semibold text-muted text-xl">登記開放時間</h2>
                <div className="mt-4 flex flex-wrap items-end gap-3">
                    {/* Start */}
                    <label className="font-medium text-muted">
                        開始
                        <input
                            type="datetime-local"
                            value={start}
                            onChange={(event) => setStart(event.target.value)}
                            className="mt-1.5 block rounded-field border border-line bg-surface2 px-3.5 py-2.5 font-mono text-fg outline-none focus:border-accent"
                        />
                    </label>

                    {/* End */}
                    <label className="font-medium text-muted">
                        結束
                        <input
                            type="datetime-local"
                            value={end}
                            onChange={(event) => setEnd(event.target.value)}
                            className="mt-1.5 block rounded-field border border-line bg-surface2 px-3.5 py-2.5 font-mono text-fg outline-none focus:border-accent"
                        />
                    </label>

                    {/* Save */}
                    <button
                        type="button"
                        onClick={saveWindow}
                        disabled={saving}
                        className="rounded-field bg-fg px-5 py-2.5 font-medium text-bg transition disabled:opacity-40"
                    >
                        {saving ? "儲存中…" : "儲存"}
                    </button>
                </div>
            </section>
        </div>
    );
}
