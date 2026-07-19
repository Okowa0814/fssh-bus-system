"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/useAuth";
import { api } from "@/services/api";
import type { MeResponse, BookingWindowDto } from "@/lib/types";
import { StatusChip } from "@/components/StatusChip";
import { ArrowRightIcon, BusIcon, UserIcon, MapPinIcon } from "@/components/icons";

function greeting(): string {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 11) return "早安";
    if (hour >= 11 && hour < 18) return "午安";
    return "晚安";
}

export default function HomePage() {
    const { user } = useCurrentUser();
    const [me, setMe] = useState<MeResponse | null>(null);
    const [window_, setWindow] = useState<BookingWindowDto | null>(null);

    useEffect(() => {
        api<MeResponse>("/api/student/me").then(setMe).catch(() => {});
        api<BookingWindowDto>("/api/student/booking-window").then(setWindow).catch(() => {});
    }, []);

    return (
        <>
            <section>
                <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                    {greeting()}，{user.name}！
                </h1>
                <p className="mt-1.5 text-sm text-muted">準備好今天的行程了嗎？</p>
            </section>

            <section className="mt-7 grid gap-4 md:grid-cols-2">
                {/* 校車登記卡片（浮水印 icon + 右下箭頭，參考 ai/2/_4） */}
                <Link
                    href="/booking"
                    className="group relative overflow-hidden rounded-3xl border border-line bg-surface p-6 transition hover:border-accent hover:shadow-lg hover:shadow-accent/10"
                >
                    <BusIcon className="pointer-events-none absolute -top-3 right-4 size-28 text-fg opacity-[0.05]" />
                    <span className="grid size-12 place-items-center rounded-2xl bg-accent text-white">
                        <BusIcon className="size-6" />
                    </span>
                    <h2 className="mt-5 text-lg font-bold">校車登記</h2>
                    <p className="mt-1 text-sm text-muted">選擇路線與座位，完成放學專車劃位。</p>
                    <span className="mt-4 flex justify-end">
                        <ArrowRightIcon className="size-5 text-muted transition group-hover:translate-x-1 group-hover:text-accent-ink" />
                    </span>
                </Link>

                {/* 我的身份卡片 */}
                <Link
                    href="/profile"
                    className="group relative overflow-hidden rounded-3xl border border-line bg-surface p-6 transition hover:border-accent hover:shadow-lg hover:shadow-accent/10"
                >
                    <UserIcon className="pointer-events-none absolute -top-3 right-4 size-28 text-fg opacity-[0.05]" />
                    <span className="grid size-12 place-items-center rounded-2xl bg-accent-wash text-accent-ink">
                        <UserIcon className="size-6" />
                    </span>
                    <h2 className="mt-5 text-lg font-bold">我的身份</h2>
                    <p className="mt-1 text-sm text-muted">查看個人資訊與已登記的路線座位。</p>
                    <span className="mt-4 flex justify-end">
                        <ArrowRightIcon className="size-5 text-muted transition group-hover:translate-x-1 group-hover:text-accent-ink" />
                    </span>
                </Link>
            </section>

            <section className="mt-7 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-line bg-surface p-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-muted">登記狀態</h3>
                        {window_ && <StatusChip status={window_.open ? "OPEN" : "CLOSED"} />}
                    </div>
                    {window_?.start && window_?.end ? (
                        <p className="mt-3 text-sm leading-relaxed">
                            開放時間：
                            <br />
                            {new Date(window_.start).toLocaleString("zh-TW")} ～
                            <br />
                            {new Date(window_.end).toLocaleString("zh-TW")}
                        </p>
                    ) : (
                        <p className="mt-3 text-sm text-muted">尚未公告登記時間。</p>
                    )}
                </div>

                <div className="rounded-3xl border border-line bg-surface p-6">
                    <h3 className="text-sm font-semibold text-muted">我的登記</h3>
                    {me?.booking ? (
                        <div className="mt-3 flex items-center gap-4">
                            <span className="grid size-12 place-items-center rounded-2xl bg-success-wash text-lg font-bold text-success-ink">
                                {me.booking.seatNumber}
                            </span>
                            <div className="text-sm">
                                <p className="font-semibold">
                                    {me.booking.schedule.route.name}・{me.booking.schedule.label}
                                </p>
                                <p className="mt-0.5 flex items-center gap-1 text-muted">
                                    <MapPinIcon className="size-3.5" />
                                    {me.booking.schedule.departAt} 發車・座位 {me.booking.seatNumber} 號
                                </p>
                            </div>
                        </div>
                    ) : (
                        <p className="mt-3 text-sm text-muted">
                            尚未登記座位，
                            <Link href="/booking" className="font-semibold text-accent-ink underline">
                                立即前往登記
                            </Link>
                            。
                        </p>
                    )}
                </div>
            </section>
        </>
    );
}
