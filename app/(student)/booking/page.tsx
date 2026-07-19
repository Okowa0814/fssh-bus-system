"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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
import { ArrowRightIcon, BusIcon, CheckIcon, MapPinIcon, XIcon } from "@/components/icons";

const STEPS = ["選擇路線", "選擇座位", "登記結果"];

type BookingResult =
    | { ok: true; booking: BookingDto }
    | { ok: false; message: string };

export default function BookingPage() {
    const [loading, setLoading] = useState(true);
    const [window_, setWindow] = useState<BookingWindowDto | null>(null);
    const [existing, setExisting] = useState<BookingDto | null>(null);
    const [routes, setRoutes] = useState<RouteDto[]>([]);

    const [step, setStep] = useState(0);
    const [route, setRoute] = useState<RouteDto | null>(null);
    const [scheduleId, setScheduleId] = useState<number | null>(null);
    const [takenSeats, setTakenSeats] = useState<number[]>([]);
    const [seatsLoading, setSeatsLoading] = useState(false);
    const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<BookingResult | null>(null);

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
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const loadSeats = useCallback(async (id: number) => {
        setSeatsLoading(true);
        setSelectedSeat(null);
        try {
            const seats = await api<SeatsResponse>(`/api/student/schedules/${id}/seats`);
            setTakenSeats(seats.takenSeats);
        } catch {
            setTakenSeats([]);
        } finally {
            setSeatsLoading(false);
        }
    }, []);

    const chooseRoute = (selected: RouteDto) => {
        setRoute(selected);
        const first = selected.schedules[0];
        setScheduleId(first ? first.id : null);
        setStep(1);
        if (first) {
            void loadSeats(first.id);
        }
    };

    const submit = async () => {
        if (scheduleId === null || selectedSeat === null) {
            return;
        }
        setSubmitting(true);
        try {
            const booking = await api<BookingDto>("/api/student/bookings", {
                method: "POST",
                body: { scheduleId, seatNumber: selectedSeat },
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
        if (scheduleId !== null) {
            void loadSeats(scheduleId);
        }
    };

    return (
        <>
            <h1 className="text-2xl font-bold tracking-tight">校車登記</h1>
            <p className="mt-1.5 text-sm text-muted">依照步驟完成放學專車劃位。</p>

            <div className="mt-7">
                {loading ? (
                    <p className="py-16 text-center text-sm text-muted">載入中…</p>
                ) : !window_?.open ? (
                    // 不在登記時間
                    <div className="mx-auto max-w-md rounded-3xl border border-line bg-surface p-10 text-center">
                        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-warning-wash text-warning-ink">
                            <BusIcon className="size-7" />
                        </span>
                        <h2 className="mt-4 text-lg font-bold">目前不在登記時間</h2>
                        {window_?.start && window_?.end ? (
                            <p className="mt-2 text-sm leading-relaxed text-muted">
                                開放時間為
                                <br />
                                {new Date(window_.start).toLocaleString("zh-TW")}
                                <br />～ {new Date(window_.end).toLocaleString("zh-TW")}
                            </p>
                        ) : (
                            <p className="mt-2 text-sm text-muted">開放時間請留意學校公告。</p>
                        )}
                    </div>
                ) : existing ? (
                    // 已有登記
                    <div className="mx-auto max-w-md rounded-3xl border border-line bg-surface p-10 text-center">
                        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-success-wash text-success-ink">
                            <CheckIcon className="size-7" />
                        </span>
                        <h2 className="mt-4 text-lg font-bold">你已完成登記</h2>
                        <p className="mt-2 text-sm text-muted">
                            {existing.schedule.route.name}・{existing.schedule.label}・座位{" "}
                            {existing.seatNumber} 號
                        </p>
                        <p className="mt-1 text-xs text-muted">如需改選，請先於身份頁取消原登記。</p>
                        <Link
                            href="/profile"
                            className="mt-6 inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                        >
                            前往身份頁
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-7">
                        <div className="mx-auto max-w-md">
                            <Stepper steps={STEPS} current={step} />
                        </div>

                        {step === 0 && (
                            <section className="grid gap-4 md:grid-cols-2">
                                {routes.length === 0 && (
                                    <p className="col-span-full py-10 text-center text-sm text-muted">
                                        目前沒有開放登記的路線。
                                    </p>
                                )}
                                {routes.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => chooseRoute(item)}
                                        className="group rounded-3xl border border-line bg-surface p-6 text-left transition hover:border-accent hover:shadow-lg hover:shadow-accent/10"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="grid size-11 place-items-center rounded-2xl bg-accent-wash text-accent-ink">
                                                <BusIcon className="size-5.5" />
                                            </span>
                                            <ArrowRightIcon className="size-5 text-muted transition group-hover:translate-x-1 group-hover:text-accent-ink" />
                                        </div>
                                        <h2 className="mt-4 text-lg font-bold">{item.name}</h2>
                                        <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                                            <MapPinIcon className="size-3.5" />
                                            {item.stations.length} 個停靠站
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {item.stations.slice(0, 4).map((station) => (
                                                <span
                                                    key={station.name}
                                                    className="rounded-full bg-bg px-2.5 py-1 text-xs text-muted"
                                                >
                                                    {station.name}
                                                </span>
                                            ))}
                                            {item.stations.length > 4 && (
                                                <span className="rounded-full bg-bg px-2.5 py-1 text-xs text-muted">
                                                    +{item.stations.length - 4}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </section>
                        )}

                        {step === 1 && route && (
                            <section className="space-y-5">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-lg font-bold">{route.name}</h2>
                                        {route.schedules.length > 1 ? (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {route.schedules.map((schedule) => (
                                                    <button
                                                        key={schedule.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setScheduleId(schedule.id);
                                                            void loadSeats(schedule.id);
                                                        }}
                                                        className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                                                            scheduleId === schedule.id
                                                                ? "bg-accent text-white"
                                                                : "border border-line bg-surface text-muted hover:text-fg"
                                                        }`}
                                                    >
                                                        {schedule.label} {schedule.departAt}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="mt-0.5 text-sm text-muted">
                                                {route.schedules[0]?.label}・
                                                {route.schedules[0]?.departAt} 發車
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setStep(0)}
                                        className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-muted transition hover:text-fg"
                                    >
                                        重選路線
                                    </button>
                                </div>

                                {scheduleId === null ? (
                                    <p className="py-10 text-center text-sm text-muted">
                                        此路線尚未開放班次。
                                    </p>
                                ) : seatsLoading ? (
                                    <p className="py-10 text-center text-sm text-muted">
                                        座位載入中…
                                    </p>
                                ) : (
                                    <SeatMap
                                        takenSeats={takenSeats}
                                        selected={selectedSeat}
                                        onSelect={setSelectedSeat}
                                    />
                                )}

                                <div className="mx-auto flex max-w-sm flex-col gap-3">
                                    <button
                                        type="button"
                                        disabled={selectedSeat === null || submitting}
                                        onClick={submit}
                                        className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        {submitting
                                            ? "送出中…"
                                            : selectedSeat === null
                                              ? "請先選擇座位"
                                              : `確認登記座位 ${selectedSeat} 號`}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => scheduleId !== null && loadSeats(scheduleId)}
                                        className="text-xs text-muted underline-offset-2 hover:underline"
                                    >
                                        重新整理座位狀態
                                    </button>
                                </div>
                            </section>
                        )}

                        {step === 2 && result && (
                            <section className="mx-auto max-w-md rounded-3xl border border-line bg-surface p-10 text-center">
                                {result.ok ? (
                                    <>
                                        <span className="mx-auto grid size-16 place-items-center rounded-full bg-success text-white">
                                            <CheckIcon className="size-8" />
                                        </span>
                                        <h2 className="mt-5 text-xl font-bold">登記成功！</h2>
                                        <div className="mt-4 rounded-2xl bg-bg p-5 text-sm">
                                            <p className="font-semibold">
                                                {result.booking.schedule.route.name}・
                                                {result.booking.schedule.label}
                                            </p>
                                            <p className="mt-1 text-muted">
                                                {result.booking.schedule.departAt} 發車
                                            </p>
                                            <p className="mt-3 text-3xl font-bold text-success-ink">
                                                {result.booking.seatNumber}
                                                <span className="ml-1 text-sm font-medium text-muted">
                                                    號座位
                                                </span>
                                            </p>
                                        </div>
                                        <div className="mt-6 flex justify-center gap-3">
                                            <Link
                                                href="/profile"
                                                className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                                            >
                                                查看身份頁
                                            </Link>
                                            <Link
                                                href="/"
                                                className="rounded-xl border border-line px-5 py-2.5 text-sm font-medium text-muted transition hover:text-fg"
                                            >
                                                回首頁
                                            </Link>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <span className="mx-auto grid size-16 place-items-center rounded-full bg-danger text-white">
                                            <XIcon className="size-8" />
                                        </span>
                                        <h2 className="mt-5 text-xl font-bold">登記失敗</h2>
                                        <p className="mt-2 text-sm text-muted">{result.message}</p>
                                        <button
                                            type="button"
                                            onClick={retry}
                                            className="mt-6 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                                        >
                                            返回重新選位
                                        </button>
                                    </>
                                )}
                            </section>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
