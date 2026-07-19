"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/useAuth";
import { api, ApiError } from "@/services/api";
import type { MeResponse } from "@/lib/types";
import { StatusChip } from "@/components/StatusChip";
import { MapPinIcon } from "@/components/icons";

export default function ProfilePage() {
    const { user } = useCurrentUser();
    const [me, setMe] = useState<MeResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const load = useCallback(() => {
        setLoading(true);
        api<MeResponse>("/api/student/me")
            .then(setMe)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const cancel = async () => {
        if (!me?.booking) {
            return;
        }
        if (!window.confirm(`確定要取消「${me.booking.schedule.route.name}」座位 ${me.booking.seatNumber} 號的登記嗎？`)) {
            return;
        }
        setCancelling(true);
        setMessage(null);
        try {
            await api(`/api/student/bookings/${me.booking.id}`, { method: "DELETE" });
            load();
        } catch (error) {
            setMessage(error instanceof ApiError ? error.message : "取消失敗，請稍後再試");
        } finally {
            setCancelling(false);
        }
    };

    const info = me?.user;

    return (
        <>
            <h1 className="text-2xl font-bold tracking-tight">我的身份</h1>
            <p className="mt-1.5 text-sm text-muted">個人資訊與專車登記狀態。</p>

            <div className="mt-7 grid gap-4 md:grid-cols-2">
                {/* 個人資訊 */}
                <section className="rounded-3xl border border-line bg-surface p-6">
                    <div className="flex items-center gap-4">
                        <span className="grid size-14 place-items-center rounded-2xl bg-accent text-xl font-bold text-white">
                            {(info?.name ?? user.name).charAt(0)}
                        </span>
                        <div>
                            <h2 className="text-lg font-bold">{info?.name ?? user.name}</h2>
                            <p className="text-sm text-muted">
                                {info?.isAdmin ? "管理員" : "學生"}
                            </p>
                        </div>
                    </div>
                    <dl className="mt-6 space-y-3 text-sm">
                        <div className="flex justify-between gap-4">
                            <dt className="shrink-0 text-muted">學號</dt>
                            <dd className="font-semibold">{info?.studentId ?? user.sub}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt className="shrink-0 text-muted">入學學年</dt>
                            <dd className="font-semibold">
                                {(info?.enrollmentYear ?? user.enrollmentYear) || "—"}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt className="shrink-0 text-muted">學校信箱</dt>
                            <dd className="break-all font-semibold">{info?.email ?? user.email}</dd>
                        </div>
                    </dl>
                </section>

                {/* 登記座位 */}
                <section className="rounded-3xl border border-line bg-surface p-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-muted">專車登記</h2>
                        {me?.booking && <StatusChip status={me.booking.status} />}
                    </div>

                    {loading ? (
                        <p className="mt-4 text-sm text-muted">載入中…</p>
                    ) : me?.booking ? (
                        <div className="mt-4">
                            <div className="rounded-2xl bg-bg p-5">
                                <p className="text-base font-bold">
                                    {me.booking.schedule.route.name}・{me.booking.schedule.label}
                                </p>
                                <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                                    <MapPinIcon className="size-4" />
                                    {me.booking.schedule.departAt} 發車
                                </p>
                                <p className="mt-4 text-4xl font-bold text-accent-ink">
                                    {me.booking.seatNumber}
                                    <span className="ml-1.5 text-sm font-medium text-muted">
                                        號座位
                                    </span>
                                </p>
                                <p className="mt-2 text-xs text-muted">
                                    登記時間：
                                    {new Date(me.booking.createdAt).toLocaleString("zh-TW")}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={cancel}
                                disabled={cancelling}
                                className="mt-4 w-full rounded-xl border border-line px-5 py-2.5 text-sm font-semibold text-danger-ink transition hover:bg-danger-wash disabled:opacity-40"
                            >
                                {cancelling ? "取消中…" : "取消登記"}
                            </button>
                            {message && (
                                <p className="mt-3 rounded-xl bg-danger-wash px-4 py-3 text-center text-sm text-danger-ink">
                                    {message}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="mt-4 rounded-2xl bg-bg p-6 text-center">
                            <p className="text-sm text-muted">尚未登記座位。</p>
                            <Link
                                href="/booking"
                                className="mt-4 inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                            >
                                前往登記
                            </Link>
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}
