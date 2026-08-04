"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BusIcon } from "@/components/icons"

import type {
    BookingDto,
    BookingWindowDto,
    MeResponse,
    RouteDto,
    SeatsResponse,
} from "@/lib/types";

import { SeatMap, Stepper, Ticket } from "@/components";
import { api, ApiError } from "@/services/api";
import { useCurrentUser } from "@/hooks/useAuth";

const STEPS = ["選路線", "選站點", "選座位", "完成"];

type BookingResult = { ok: true; booking: BookingDto } | { ok: false };


export default function BookingPage() {
    /*
        - user: 使用者資料
        - loading: 是否正在載入初始資料
        - window_: 登記開放時間資訊
        - existing: 使用者已存在的登記資料
        - routes: 可選的路線列表
        - profile: 使用者個人資料
        
        - step: 當前步驟索引
        - route: 選擇的路線
        - selectedStation: 選擇的上車站點
        - takenSeats: 已被佔用的座位號碼列表
        - seatsLoading: 是否正在載入座位資訊
        - submitting: 是否正在提交登記
        - result: 登記結果

    */
    const { user } = useCurrentUser();
    const [loading, setLoading] = useState(true);

    const [window_, setWindow] = useState<BookingWindowDto | null>(null);
    const [existing, setExisting] = useState<BookingDto | null>(null);
    const [routes, setRoutes] = useState<RouteDto[]>([]);
    const [profile, setProfile] = useState<MeResponse["user"] | null>(null);

    const [step, setStep] = useState(0);
    const [route, setRoute] = useState<RouteDto | null>(null);
    const [selectedStation, setSelectedStation] = useState<string | null>(null);
    const [takenSeats, setTakenSeats] = useState<number[]>([]);
    const [seatsLoading, setSeatsLoading] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<BookingResult | null>(null);

    // Load seats for a given route ID
    const loadSeats = useCallback(async (id: number) => {
        setSeatsLoading(true);
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
            setSelectedStation(null);
            setStep(1);
            void loadSeats(selected.id);
        },
        [loadSeats],
    );

    const chooseStation = useCallback((stationName: string) => {
        setSelectedStation(stationName);
        setStep(2);
    }, []);

    // Load initial data on component mount
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
                setProfile(meData.user);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    // Submit the booking with the selected route, station, and seat
    const submit = async (seatNumber: number) => {
        if (route === null || selectedStation === null) {
            return;
        }

        setSubmitting(true);

        try {
            const booking = await api<BookingDto>("/api/student/bookings", {
                method: "POST",
                body: { routeId: route.id, station: selectedStation, seatNumber },
            });
            setResult({ ok: true, booking });
        } catch (error) {
            alert(error instanceof ApiError ? error.message : "登記失敗，請稍後再試");
            setResult({ ok: false });
        } finally {
            setSubmitting(false);
            setStep(3);
        }
    };

    // Ask for confirmation on seat tap
    const handleSelectSeat = (seatNumber: number) => {
        if (route === null || selectedStation === null) {
            return;
        }

        const confirmed = window.confirm(
            `確定要選擇 ${route.name}・${selectedStation}・座位 ${seatNumber} 號嗎？`,
        );

        if (!confirmed) {
            return;
        }

        void submit(seatNumber);
    };

    // Retry booking by resetting the result and step, and reloading seats if a route is selected
    const retry = () => {
        setResult(null);
        setStep(2);
        if (route !== null) {
            void loadSeats(route.id);
        }
    };

    const rows = [
        { k: "姓名", v: profile?.name ?? user.name, mono: false },
        { k: "學號", v: profile?.studentId ?? user.sub, mono: true },
        { k: "入學學年", v: (profile?.enrollmentYear ?? user.enrollmentYear) || "—", mono: false },
    ];

    return (
        <>
            {
                loading ? (
                    // Loading
                    <p className="py-16 text-center text-xl text-muted">載入中…</p>
                ) : !window_?.open ? (
                    // Not in booking time
                    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-card bg-surface p-10 text-center shadow-card">
                        {/* Icon */ }
                        <span className="grid size-13 place-items-center rounded-2xl bg-warning-wash text-warning-ink">
                            <BusIcon className="size-8" />
                        </span>

                        {/* Title */ }
                        <h2 className="text-2xl font-bold tracking-tight">目前不在登記時間</h2>

                        {/* Description */ }
                        {window_?.start && window_?.end ? (
                            <p className=" leading-relaxed text-muted">
                                開放時間為
                                <br />
                                {new Date(window_.start).toLocaleString("zh-TW", { hour12: false })}
                                <br />～ {new Date(window_.end).toLocaleString("zh-TW", { hour12: false })}
                            </p>
                        ) : (
                            <p className="text-muted">開放時間請留意學校公告。</p>
                        )}
                    </div>
                ) : existing ? (
                    // Already booked
                    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-card bg-surface p-10 text-center shadow-card">
                        <span className="grid size-13 place-items-center rounded-full bg-success-wash text-success-ink">
                            ✓
                        </span>

                        <h2 className="text-[19px] font-bold tracking-tight">你已完成登記</h2>

                        <p className="text-sm text-muted">
                            {existing.route.name}・{existing.station}・座位 {existing.seatNumber} 號
                        </p>

                        <p className="text-xs text-muted">如需改選，請先在首頁取消原登記。</p>

                        <Link
                            href="/"
                            className="mt-2 inline-block rounded-field bg-fg px-5 py-2.5 text-sm font-medium text-bg"
                        >
                            回首頁
                        </Link>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        <Stepper steps={STEPS} current={step} goto={setStep} />

                        {/* Step 0: Choose Route */}
                        {step === 0 && (
                            <div className="flex flex-col gap-4">
                                {/* Header */ }
                                <h2 className="text-[clamp(24px,3.2vw,32px)] font-bold tracking-tight">
                                    你要搭乘哪個路線？
                                </h2>

                                {/* No routes available */ }
                                {routes.length === 0 && (
                                    <p className="py-10 text-center text-xl text-muted">目前沒有開放登記的路線。</p>
                                )}
                                
                                {/* Routes list */ }
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {routes.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => chooseRoute(item)}
                                            className={`flex flex-col gap-3.5 rounded-card border bg-surface p-5 text-left shadow-card transition
                                                ${route?.id === item.id ? "border-accent" : "border-line"}
                                            `}
                                        >
                                            <div className="flex items-start justify-between gap-3.5">

                                                <p className="text-xl font-bold tracking-tight">{item.name}</p>

                                                {item.departAt && (
                                                    <span className="rounded-full px-2.5 py-1 font-mono text-muted">
                                                        {item.departAt} 發車
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Step 1: Choose Station */}
                        {step === 1 && route && (
                            <div className="flex flex-col gap-4">
                                {/* Header */ }
                                <h2 className="text-[clamp(24px,3.2vw,32px)] font-bold tracking-tight">
                                    在哪一站上車？
                                </h2>
                                <p className="text-muted">
                                    {route.name}
                                    {route.departAt && ` · ${route.departAt} 發車`}
                                </p>

                                {/* No stations available */ }
                                {route.stations.filter((s) => s.enabled).length === 0 && (
                                    <p className="py-10 text-center text-xl text-muted">這條路線目前沒有開放的站點。</p>
                                )}

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {route.stations
                                        .filter((s) => s.enabled)
                                        .map((s) => (
                                            <button
                                                key={s.name}
                                                type="button"
                                                onClick={() => chooseStation(s.name)}
                                                className={`flex items-center justify-between gap-3.5 rounded-card border bg-surface p-5 text-left shadow-card transition ${
                                                    selectedStation === s.name ? "border-accent" : "border-line"
                                                }`}
                                            >
                                                <p className="text-xl font-medium">{s.name}</p>
                                                <span className="font-mono text-muted">{s.arriveAt}</span>
                                            </button>
                                        ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Step 2: Choose Seat */}
                        {step === 2 && route && selectedStation && (
                            <div className="flex flex-col gap-5">
                                {/* Header */ }
                                <h2 className="text-[clamp(24px,3.2vw,32px)] font-bold tracking-tight">挑一個位子</h2>
                                <p className="text-muted">
                                    {route.name} · {selectedStation}
                                    {route.departAt && ` · ${route.departAt} 發車`}
                                </p>

                                {/* SeatMap */ }
                                {seatsLoading ? (
                                    <p className="py-10 text-center text-xl text-muted">座位載入中…</p>
                                ) : (
                                    <SeatMap
                                        takenSeats={takenSeats}
                                        disabled={submitting}
                                        onSelect={handleSelectSeat}
                                        onRefresh={() => void loadSeats(route.id)}
                                    />
                                )}
                            </div>
                        )}

                        {/* Step 3: Result */}
                        {step === 3 && result && (
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

                                        <Ticket booking={result.booking} rows={rows} />

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
                )
            }
        </>
    )
}
