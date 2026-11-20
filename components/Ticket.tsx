"use client";

import { useState } from "react";
import { BadgeIcon } from "@/components/icons";
import type { BookingDto } from "@/lib/types";

function formatBookedAt(iso: string): string {
    const d = new Date(iso);
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${d.getMonth() + 1} 月 ${d.getDate()} 日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// QR code 尚未實作：之後接上真正的車票 QR 時，替換這個元件即可
function QrPlaceholder() {
    return (
        <div className="grid size-40 shrink-0 place-items-center rounded-2xl border-[1.5px] border-dashed border-line-strong font-mono text-sm font-medium text-muted">
            QR code WIP
        </div>
    );
}

/** 電子車票：正面是車票資訊，點一下翻面顯示 QR code */
export function Ticket({ booking }: { booking: BookingDto }) {
    const [flipped, setFlipped] = useState(false);

    return (
        <div className="w-full [perspective:1800px]">
            <button
                type="button"
                onClick={() => setFlipped((value) => !value)}
                aria-label={flipped ? "翻回車票正面" : "翻面顯示 QR code"}
                aria-pressed={flipped}
                className="grid w-full cursor-pointer appearance-none border-0 bg-transparent p-0 text-left transition-transform duration-700 [transform-style:preserve-3d] motion-reduce:transition-none"
                style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
            >
                {/* Front - 車票 */}
                <div
                    aria-hidden={flipped}
                    className="relative col-start-1 row-start-1 flex flex-col overflow-hidden rounded-[22px] border border-line bg-surface [backface-visibility:hidden] md:flex-row md:rounded-3xl"
                >
                    {/* 角落的四分之一圓裝飾 */}
                    <span
                        aria-hidden="true"
                        className="absolute -top-px -right-px size-21 rounded-bl-full bg-surface2 md:top-auto md:right-auto md:-bottom-px md:-left-px md:size-30 md:rounded-tr-full md:rounded-bl-none"
                    />

                    {/* 車票主體 */}
                    <div className="relative flex min-w-0 flex-1 flex-col gap-4.5 px-5.5 pt-5.5 pb-5 md:gap-7 md:px-8 md:pt-8 md:pb-9">
                        <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2.5 text-[15px] font-medium">
                                <BadgeIcon size={26} />
                                鳳山高中專車
                            </span>
                            <span className="text-sm text-muted">本學期電子車票</span>
                        </div>

                        <div className="flex flex-col gap-1 md:gap-1.5">
                            <span className="text-[13px] text-muted md:text-sm">路線</span>
                            <span className="font-display text-[32px] leading-[1.15] font-bold break-words md:text-[44px] md:leading-[1.1]">
                                {booking.route.name}
                            </span>
                        </div>

                        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 md:gap-y-5">
                            <div className="flex flex-col gap-0.5 md:gap-1">
                                <dt className="text-[13px] text-muted md:text-sm">上車站</dt>
                                <dd className="text-[17px] font-medium md:text-xl">{booking.station}</dd>
                            </div>
                            <div className="flex flex-col gap-0.5 md:gap-1">
                                <dt className="text-[13px] text-muted md:text-sm">到站時間</dt>
                                <dd className="text-[22px] font-semibold tracking-[0.01em] md:text-[28px]">
                                    {booking.arriveAt || "—"}
                                </dd>
                            </div>
                        </dl>
                    </div>

                    {/* 撕線（手機：橫向） */}
                    <div aria-hidden="true" className="relative h-6 md:hidden">
                        <span className="absolute top-0 -left-[13px] size-6 rounded-full border border-line bg-bg" />
                        <span className="absolute top-0 -right-[13px] size-6 rounded-full border border-line bg-bg" />
                        <span className="absolute top-[11px] right-5 left-5 border-t-2 border-dashed border-line" />
                    </div>

                    {/* 撕線（桌機：直向） */}
                    <div aria-hidden="true" className="relative hidden w-7 shrink-0 md:block">
                        <span className="absolute -top-3.5 left-0 size-7 rounded-full border border-line bg-bg" />
                        <span className="absolute -bottom-3.5 left-0 size-7 rounded-full border border-line bg-bg" />
                        <span className="absolute top-6.5 bottom-6.5 left-[13px] border-l-2 border-dashed border-line" />
                    </div>

                    {/* 票根：座位 */}
                    <div className="relative flex items-center gap-4.5 px-5.5 pt-4.5 pb-5.5 md:w-[220px] md:shrink-0 md:flex-col md:justify-center md:gap-3.5 md:px-6 md:py-8">
                        <span className="hidden text-sm text-muted md:block">座位</span>
                        <span className="grid size-21 shrink-0 place-items-center rounded-full bg-accent text-[38px] font-semibold tracking-[-0.02em] text-ink md:size-33 md:text-[60px]">
                            {booking.seatNumber}
                        </span>
                        <span className="flex flex-col gap-1 md:items-center md:text-center">
                            <span className="text-[17px] font-medium md:hidden">座位 {booking.seatNumber} 號</span>
                            <span className="text-[13px] text-muted">{formatBookedAt(booking.createdAt)} 登記</span>
                            <span className="text-[13px] text-muted">點一下顯示 QR code</span>
                        </span>
                    </div>
                </div>

                {/* Back - QR code */}
                <div
                    aria-hidden={!flipped}
                    className="relative col-start-1 row-start-1 flex flex-col items-center justify-center gap-5 overflow-hidden rounded-[22px] border border-line bg-surface p-6 [transform:rotateY(180deg)] [backface-visibility:hidden] md:flex-row md:gap-9 md:rounded-3xl md:p-8"
                >
                    <span
                        aria-hidden="true"
                        className="absolute -right-px -bottom-px size-21 rounded-tl-full bg-surface2 md:size-30"
                    />

                    <QrPlaceholder />

                    <div className="relative flex flex-col items-center gap-2 text-center md:items-start md:text-left">
                        <span className="text-sm text-muted">電子車票 QR code</span>
                        <span className="font-display text-2xl leading-tight font-bold md:text-[28px]">
                            {booking.route.name}・{booking.seatNumber} 號
                        </span>
                        <span className="max-w-[24em] text-sm leading-relaxed text-muted">
                            QR code 功能準備中。
                        </span>
                        <span className="text-[13px] text-muted">點一下翻回正面</span>
                    </div>
                </div>
            </button>
        </div>
    );
}
