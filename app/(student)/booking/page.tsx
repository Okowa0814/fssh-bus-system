"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "@/services/api";
import type {
    BookingDto,
    BookingWindowDto,
    MeResponse,
    RouteDto,
    SeatsResponse,
} from "@/lib/types";
import { Stepper } from "@/components/Stepper";
import { SeatMap } from "@/components/SeatMap";
import { StationTimeline } from "@/components/StationTimeline";

const STEPS = ["選路線", "選座位", "完成"];

type BookingResult =
    | { ok: true; booking: BookingDto }
    | { ok: false; message: string };

function BookingPageInner() {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [window_, setWindow] = useState<BookingWindowDto | null>(null);
    const [existing, setExisting] = useState<BookingDto | null>(null);
    const [routes, setRoutes] = useState<RouteDto[]>([]);

    const [step, setStep] = useState(0);
    const [route, setRoute] = useState<RouteDto | null>(null);
    const [takenSeats, setTakenSeats] = useState<number[]>([]);
    const [seatsLoading, setSeatsLoading] = useState(false);
    const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<BookingResult | null>(null);

    const loadSeats = useCallback(async (id: number) => {
        setSeatsLoading(true);
        setSelectedSeat(null);
        try {
            const seats = await api<SeatsResponse>(`/api/student/routes/${id}/seats`);
            setTakenSeats(seats.takenSeats);
        } catch {
            setTakenSeats([]);
        } finally {
            setSeatsLoading(false);
        }
    }, []);

    const chooseRoute = useCallback(
        (selected: RouteDto) => {
            setRoute(selected);
            setStep(1);
            void loadSeats(selected.id);
        },
        [loadSeats],
    );

    useEffect(() => {
        Promise.all([
            api<BookingWindowDto>("/api/student/booking-window"),
            api<MeResponse>("/api/student/me"),
            api<RouteDto[]>("/api/student/routes"),
        ])
            .then(([windowData, meData, routesData]) => {
                setWindow(windowData);
                setExisting(meData.booking);
                setRoutes(routesData);

                const preselectId = Number(searchParams.get("routeId"));
                if (preselectId && windowData.open && !meData.booking) {
                    const match = routesData.find((r) => r.id === preselectId);
                    if (match) chooseRoute(match);
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const submit = async () => {
        if (route === null || selectedSeat === null) {
            return;
        }
        setSubmitting(true);
        try {
            const booking = await api<BookingDto>("/api/student/bookings", {
                method: "POST",
                body: { routeId: route.id, seatNumber: selectedSeat },
            });
            setResult({ ok: true, booking });
        } catch (error) {
            setResult({
                ok: false,
                message: error instanceof ApiError ? error.message : "登記失敗，請稍後再試",
            });
        } finally {
            setSubmitting(false);
            setStep(2);
        }
    };

    const retry = () => {
        setResult(null);
        setStep(1);
        if (route !== null) {
            void loadSeats(route.id);
        }
    };

    if (loading) {
        return <p className="py-16 text-center text-sm text-muted">載入中…</p>;
    }

    if (!window_?.open) {
        return (
            <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-card bg-surface p-10 text-center shadow-card">
                <span className="grid size-13 place-items-center rounded-2xl bg-warning-wash text-warning-ink">
                    <span className="size-1.5 rounded-full bg-warning" />
                </span>
                <h2 className="text-[19px] font-bold tracking-tight">目前不在登記時間</h2>
                {window_?.start && window_?.end ? (
                    <p className="text-sm leading-relaxed text-muted">
                        開放時間為
                        <br />
                        {new Date(window_.start).toLocaleString("zh-TW", { hour12: false })}
                        <br />～ {new Date(window_.end).toLocaleString("zh-TW", { hour12: false })}
                    </p>
                ) : (
                    <p className="text-sm text-muted">開放時間請留意學校公告。</p>
                )}
            </div>
        );
    }

    if (existing) {
        return (
            <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-card bg-surface p-10 text-center shadow-card">
                <span className="grid size-13 place-items-center rounded-full bg-success-wash text-success-ink">
                    ✓
                </span>
                <h2 className="text-[19px] font-bold tracking-tight">你已完成登記</h2>
                <p className="text-sm text-muted">
                    {existing.route.name}・座位 {existing.seatNumber} 號
                </p>
                <p className="text-xs text-muted">如需改選，請先在首頁取消原登記。</p>
                <Link
                    href="/"
                    className="mt-2 inline-block rounded-field bg-fg px-5 py-2.5 text-sm font-medium text-bg"
                >
                    回首頁
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <Stepper steps={STEPS} current={step} />

            {step === 0 && (
                <div className="flex flex-col gap-4">
                    <div>
                        <h2 className="text-[clamp(20px,3.2vw,26px)] font-bold tracking-tight">
                            你要搭哪一台？
                        </h2>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted">
                            一台車一條路線，選好之後再挑位子。
                        </p>
                    </div>
                    {routes.length === 0 && (
                        <p className="py-10 text-center text-sm text-muted">目前沒有開放登記的路線。</p>
                    )}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {routes.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => chooseRoute(item)}
                                className={`flex flex-col gap-3.5 rounded-card border bg-surface p-5 text-left shadow-card transition ${
                                    route?.id === item.id ? "border-accent" : "border-line"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3.5">
                                    <p className="text-[17px] font-bold tracking-tight">{item.name}</p>
                                    {item.departAt && (
                                        <span className="rounded-full bg-surface2 px-2.5 py-1 font-mono text-[11px] text-muted">
                                            {item.departAt} 發車
                                        </span>
                                    )}
                                </div>
                                <StationTimeline stations={item.stations} dense />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {step === 1 && route && (
                <div className="flex flex-col gap-5">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <h2 className="text-[clamp(20px,3.2vw,26px)] font-bold tracking-tight">挑一個位子</h2>
                            <p className="mt-1.5 text-sm text-muted">
                                {route.name}
                                {route.departAt && ` · ${route.departAt} 發車`}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setStep(0)}
                            className="text-[13px] text-muted underline decoration-line underline-offset-4"
                        >
                            換一條路線
                        </button>
                    </div>

                    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                        {seatsLoading ? (
                            <p className="py-10 text-center text-sm text-muted">座位載入中…</p>
                        ) : (
                            <SeatMap takenSeats={takenSeats} selected={selectedSeat} onSelect={setSelectedSeat} />
                        )}

                        <div className="flex flex-col gap-3.5 rounded-card bg-surface p-5 shadow-card lg:sticky lg:top-20">
                            <p className="font-mono text-[11px] tracking-wide text-muted uppercase">確認一下</p>
                            <div className="flex flex-col gap-2.5">
                                <div className="flex items-baseline justify-between gap-4">
                                    <span className="text-[13px] text-muted">路線</span>
                                    <span className="text-[13.5px] font-medium">{route.name}</span>
                                </div>
                                {route.departAt && (
                                    <div className="flex items-baseline justify-between gap-4">
                                        <span className="text-[13px] text-muted">發車</span>
                                        <span className="font-mono text-[13.5px]">{route.departAt}</span>
                                    </div>
                                )}
                                {route.stations.length > 0 && (
                                    <div className="flex items-baseline justify-between gap-4">
                                        <span className="text-[13px] text-muted">下車站</span>
                                        <span className="text-[13.5px]">
                                            {route.stations[route.stations.length - 1].name}
                                        </span>
                                    </div>
                                )}
                                <div className="flex items-baseline justify-between gap-4">
                                    <span className="text-[13px] text-muted">座位</span>
                                    <span
                                        className={`font-mono text-[13.5px] ${selectedSeat ? "text-accent" : "text-muted"}`}
                                    >
                                        {selectedSeat ?? "尚未選擇"}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                disabled={selectedSeat === null || submitting}
                                onClick={submit}
                                className="rounded-field bg-fg px-4 py-3.5 text-[15px] font-medium text-bg transition disabled:cursor-not-allowed disabled:bg-surface2 disabled:text-muted"
                            >
                                {submitting ? "送出中…" : "確認登記"}
                            </button>
                            <button
                                type="button"
                                onClick={() => void loadSeats(route.id)}
                                className="text-center text-xs text-muted underline decoration-line underline-offset-4"
                            >
                                重新整理座位狀態
                            </button>
                            <p className="text-center text-[11.5px] leading-relaxed text-muted">
                                一人只能登記一個位子，開放時間內都可以取消。
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {step === 2 && result && (
                <div className="flex flex-col items-center gap-5 py-2">
                    {result.ok ? (
                        <>
                            <div className="flex flex-col items-center gap-2 text-center">
                                <span className="grid size-11 place-items-center rounded-full bg-accent-wash text-[20px] text-accent">
                                    ✓
                                </span>
                                <h2 className="text-[clamp(21px,3.4vw,28px)] font-bold tracking-tight">
                                    位子留給你了
                                </h2>
                                <p className="text-sm text-muted">上車前把這張票打開給隨車老師看就好。</p>
                            </div>

                            <div className="w-full max-w-sm overflow-hidden rounded-card bg-surface shadow-card-lg">
                                <div className="flex flex-col gap-4.5 px-6 pt-5.5 pb-4.5">
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-[11px] tracking-widest text-muted">
                                            BOARDING PASS
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold tracking-tight">
                                            {result.booking.route.name}
                                        </p>
                                    </div>
                                    <div className="flex items-end justify-between gap-3">
                                        <div>
                                            <p className="text-[11px] text-muted">鳳山高中</p>
                                            <p className="mt-0.5 font-mono text-2xl font-medium">
                                                {result.booking.route.departAt || "—"}
                                            </p>
                                        </div>
                                        <div className="flex flex-1 items-center gap-1.5 pb-2">
                                            <div className="h-px flex-1 bg-line" />
                                            <span className="size-1.5 rounded-full bg-accent" />
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[11px] text-muted">座位</p>
                                            <p className="mt-0.5 font-mono text-2xl font-medium text-accent">
                                                {result.booking.seatNumber}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="relative h-6">
                                    <div className="absolute top-0 -left-3 size-6 rounded-full bg-bg" />
                                    <div className="absolute top-0 -right-3 size-6 rounded-full bg-bg" />
                                    <div className="absolute top-3 right-4.5 left-4.5 h-px bg-[repeating-linear-gradient(90deg,var(--muted)_0_5px,transparent_5px_11px)]" />
                                </div>
                                <div className="flex items-center justify-between gap-4 px-6 pt-4 pb-6">
                                    <div>
                                        <p className="text-[11px] text-muted">登記時間</p>
                                        <p className="mt-1 font-mono text-[11px] text-muted">
                                            {new Date(result.booking.createdAt).toLocaleString("zh-TW", {
                                                hour12: false,
                                            })}
                                        </p>
                                    </div>
                                    <div className="size-14 rounded-lg bg-[repeating-conic-gradient(var(--fg)_0%_25%,var(--surface)_0%_50%)] bg-[length:9px_9px]" />
                                </div>
                            </div>

                            <Link
                                href="/"
                                className="rounded-field bg-fg px-5.5 py-3 text-sm font-medium text-bg"
                            >
                                回首頁看車票
                            </Link>
                        </>
                    ) : (
                        <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-card bg-surface p-10 text-center shadow-card">
                            <span className="grid size-13 place-items-center rounded-full bg-danger-wash text-[20px] text-danger-ink">
                                ✕
                            </span>
                            <h2 className="text-[19px] font-bold tracking-tight">登記失敗</h2>
                            <p className="text-sm text-muted">{result.message}</p>
                            <button
                                type="button"
                                onClick={retry}
                                className="mt-2 rounded-field bg-fg px-5 py-2.5 text-sm font-medium text-bg"
                            >
                                返回重新選位
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function BookingPage() {
    return (
        <Suspense fallback={<p className="py-16 text-center text-sm text-muted">載入中…</p>}>
            <BookingPageInner />
        </Suspense>
    );
}
