"use client";

import { useState } from "react";
import { BadgeIcon } from "@/components/icons";
import type { BookingDto } from "@/lib/types";
import { formatPrice } from "@/lib/pricing";

export interface TicketInfoRow {
    k: string;
    v: string;
    mono: boolean;
}

function InfoFace({ rows }: { rows: TicketInfoRow[] }) {
    return (
        <div className="relative h-full w-full">
            <div className="absolute top-1/2 left-1/2 flex h-[320px] w-[560px] -translate-x-1/2 -translate-y-1/2 rotate-90 md:rotate-0">
                {/* Profile content */}
                <div className="flex w-[380px] shrink-0 flex-col gap-0.5 py-5 pr-2 pl-5">
                    {/* Icon & Title */}
                    <p className="mb-2 shrink-0 font-mono text-2xl mt-4 tracking-wide text-muted uppercase">我的資料</p>

                    {/* Info rows */}
                    <div className="flex min-h-0 flex-1 flex-col gap-0.5 mt-4 overflow-y-auto">
                        {rows.map((row) => (
                            <div
                                key={row.k}
                                className="flex items-baseline justify-between gap-5 border-b border-line py-3"
                            >
                                <span className="text-muted text-lg">{row.k}</span>
                                <span
                                    className={`text-right break-all text-lg ${row.mono ? "font-mono text-muted" : "font-medium"}`}
                                >
                                    {row.v}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Ticket decoration - aligned with the front face's decoration */}
                <div className="relative w-7.5 shrink-0 self-stretch">
                    <div className="absolute -top-3 left-1/2 size-6 -translate-x-1/2 rounded-full bg-bg" />
                    <div className="absolute -bottom-3 left-1/2 size-6 -translate-x-1/2 rounded-full bg-bg" />
                    <div className="absolute inset-y-5 left-1/2 w-px -translate-x-1/2 bg-[repeating-linear-gradient(180deg,var(--muted)_0_5px,transparent_5px_11px)]" />
                </div>

                {/* Footer note */}
                <div className="flex w-[150px] shrink-0 flex-col items-center justify-center px-3 py-5 text-center">
                    <p className="text-xs leading-relaxed text-muted">
                        個人資料由Google帳戶同步，如有錯誤請洽圖書館
                    </p>
                </div>
            </div>
        </div>
    );
}

export function Ticket({ booking, rows }: { booking: BookingDto | null; rows: TicketInfoRow[] }) {
    const [flipped, setFlipped] = useState(false);

    // If the user has not booked a seat yet, show the info face only
    if (!booking) {
        return (
            <div className="h-[560px] w-[320px] overflow-hidden rounded-card bg-surface shadow-card-lg md:h-[320px] md:w-[560px]">
                <InfoFace rows={rows} />
            </div>
        );
    }

    const arriveAt = booking.arriveAt;

    return (
        <div style={{ perspective: 1800 }}>
            <button
                type="button"
                onClick={() => setFlipped((f) => !f)}
                aria-label={flipped ? "翻回車票正面" : "查看我的資料"}
                className="relative block h-[560px] w-[320px] appearance-none border-0 bg-transparent p-0 text-left transition-transform duration-700 md:h-[320px] md:w-[560px]"
                style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
            >
                {/* Front - Rotating ticket */}
                <div
                    className="absolute inset-0 overflow-hidden rounded-card bg-surface shadow-card-lg"
                    style={{ backfaceVisibility: "hidden" }}
                >
                    <div className="relative h-full w-full">
                        <div className="absolute top-1/2 left-1/2 flex h-[320px] w-[560px] -translate-x-1/2 -translate-y-1/2 rotate-90 md:rotate-0">
                            {/* Ticket content */}
                            <div className="flex w-[380px] shrink-0 flex-col justify-between py-5 pr-2 pl-5">
                                {/* Icon & Title */}
                                <div className="flex items-center gap-2.5 mt-2 font-bold">
                                    <BadgeIcon size={32} />
                                    <span className="font-mono text-2xl tracking-wide text-muted uppercase">
                                        鳳山高中專車
                                    </span>
                                </div>
                                
                                {/* Route name */}
                                <p className="truncate text-4xl font-bold tracking-tight">
                                    {booking.route.name}
                                </p>
                                
                                {/* Boarding station & price */}
                                <p className="text-lg text-muted">
                                    {booking.station} 上車 · {formatPrice(booking.monthlyPrice)}/月
                                </p>

                                <div className="flex items-end gap-8">
                                    {/* Arrival time */}
                                    {arriveAt && (
                                        <div>
                                            <p className="text-xs text-muted">到站</p>
                                            <p className="mt-0.5 font-mono text-3xl font-medium">{arriveAt}</p>
                                        </div>
                                    )}

                                    {/* Seat number */}
                                    <div className="ml-8">
                                        <p className="text-xs text-muted">座位</p>
                                        <p className="mt-0.5 font-mono text-3xl font-medium text-accent">
                                            {booking.seatNumber}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Ticket decoration */}
                            <div className="relative w-7.5 shrink-0 self-stretch">
                                <div className="absolute -top-3 left-1/2 size-6 -translate-x-1/2 rounded-full bg-bg" />
                                <div className="absolute -bottom-3 left-1/2 size-6 -translate-x-1/2 rounded-full bg-bg" />
                                <div className="absolute inset-y-5 left-1/2 w-px -translate-x-1/2 bg-[repeating-linear-gradient(180deg,var(--muted)_0_5px,transparent_5px_11px)]" />
                            </div>
                            
                            {/* Ticket stub */}
                            <div className="flex w-[150px] shrink-0 flex-col items-center justify-between py-5">
                                <div className="size-13 rounded-lg bg-[repeating-conic-gradient(var(--fg)_0%_25%,var(--surface)_0%_50%)] bg-[length:9px_9px]" />
                                <p className="text-center font-mono text-xs leading-tight text-muted">
                                    {new Date(booking.createdAt).toLocaleString("zh-TW", { hour12: false })}
                                </p>
                                <p className="text-center text-sm text-muted">點一下看我的資料</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Back - My profile */}
                <div
                    className="absolute inset-0 overflow-hidden rounded-card bg-surface shadow-card-lg"
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                    <InfoFace rows={rows} />
                </div>

            </button>
        </div>
    );
}
