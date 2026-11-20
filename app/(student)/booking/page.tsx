"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { BusIcon, CheckIcon } from "@/components/icons";

import type {
    BookingDto,
    BookingWindowDto,
    MeResponse,
    RouteDto,
    SeatsResponse,
    WaitlistEntryDto,
} from "@/lib/types";

import { PageLoader, SeatMap, Stepper, useBookingNav } from "@/components";
import { api, ApiError } from "@/services/api";
import { formatPrice } from "@/lib/pricing";

type BookingResult =
    | { ok: true; kind: "booking"; booking: BookingDto }
    | { ok: true; kind: "waitlist"; entry: WaitlistEntryDto }
    | { ok: false };

// 路線月費區間（依上車站不同）
function priceRange(route: RouteDto): string {
    const prices = route.stations.map((s) => s.monthlyPrice);
    if (prices.length === 0) return "—";

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? formatPrice(min) : `${formatPrice(min)}–${max}`;
}

const pad = (value: number) => String(value).padStart(2, "0");

function formatDateTime(iso: string): string {
    const d = new Date(iso);
    return `${d.getMonth() + 1} 月 ${d.getDate()} 日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 置中的狀態卡（非登記時間、已登記、候補中、失敗…）
function StateCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
    return (
        <div className="relative mx-auto flex w-full max-w-[560px] flex-col items-start gap-5 overflow-hidden rounded-[28px] border border-line p-7 md:p-10">
            <span
                aria-hidden="true"
                className="absolute -top-px -right-px size-28 rounded-bl-full bg-surface2 md:size-36"
            />
            <span className="relative">{icon}</span>
            <h1 className="relative font-display text-[26px] leading-tight font-bold md:text-[32px]">{title}</h1>
            <div className="relative flex w-full flex-col items-stretch gap-4 text-[15px] leading-[1.7] text-muted *:flex-none md:items-start md:text-base">
                {children}
            </div>
        </div>
    );
}

// 步驟底部操作列：手機固定在畫面底部，桌機接在內容下方
function ActionBar({ children }: { children: ReactNode }) {
    return (
        <div className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-3 border-t border-line bg-bg px-5 pt-3.5 pb-[calc(14px+env(safe-area-inset-bottom))] md:static md:flex-wrap md:justify-between md:gap-4 md:border-line-soft md:px-0 md:pt-5 md:pb-0">
            {children}
        </div>
    );
}

const primaryButton =
    "flex h-13.5 flex-1 items-center justify-center rounded-full bg-fg px-8 font-medium whitespace-nowrap text-ink transition disabled:bg-faint md:h-14 md:flex-none";
const secondaryButton =
    "flex h-13.5 flex-1 items-center justify-center rounded-full border-[1.5px] border-line bg-surface px-5 font-medium transition hover:border-fg md:h-12 md:flex-none md:text-[15px]";

export default function BookingPage() {
    /*
        - loading: 是否正在載入初始資料
        - window_: 登記開放時間資訊
        - existing: 使用者已存在的登記資料
        - routes: 可選的路線列表

        - step: 當前步驟索引
        - route: 選擇的路線
        - selectedStation: 選擇的上車站點
        - pendingSeat: 目前選取的座位
        - seatConfirmOpen: 是否顯示座位確認視窗
        - takenSeats: 已被佔用的座位號碼列表
        - seatsLoading: 是否正在載入座位資訊
        - submitting: 是否正在提交登記
        - result: 登記結果
    */
    const [loading, setLoading] = useState(true);

    const [window_, setWindow] = useState<BookingWindowDto | null>(null);
    const [existing, setExisting] = useState<BookingDto | null>(null);
    const [existingWaitlist, setExistingWaitlist] = useState<WaitlistEntryDto | null>(null);
    const [routes, setRoutes] = useState<RouteDto[]>([]);

    const [step, setStep] = useState(0);
    const [route, setRoute] = useState<RouteDto | null>(null);
    const [selectedStation, setSelectedStation] = useState<string | null>(null);
    const [pendingSeat, setPendingSeat] = useState<number | null>(null);
    const [seatConfirmOpen, setSeatConfirmOpen] = useState(false);
    const [takenSeats, setTakenSeats] = useState<number[]>([]);
    const [seatsLoading, setSeatsLoading] = useState(false);
    const [seatsError, setSeatsError] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<BookingResult | null>(null);

    // Load initial data on component mount
    useEffect(() => {
        Promise.all([
            api<BookingWindowDto>("/api/student/booking-window"),
            api<MeResponse>("/api/student/me"),
            api<RouteDto[]>("/api/public/routes"),
        ])
            .then(([windowData, meData, routesData]) => {
                setWindow(windowData);
                setExisting(meData.booking);
                setExistingWaitlist(meData.waitlist);
                setRoutes(routesData);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    // Load seats for a given route ID
    const loadSeats = useCallback(async (id: number) => {
        setSeatsLoading(true);
        setSeatsError(false);
        try {
            const seats = await api<SeatsResponse>(`/api/student/routes/${id}/seats`);
            setTakenSeats(seats.takenSeats);
        } catch {
            setTakenSeats([]);
            setSeatsError(true);
        } finally {
            setSeatsLoading(false);
        }
    }, []);

    // Step 0: pick a route (highlight only — "下一步" moves on)
    const pickRoute = (selected: RouteDto) => {
        if (route?.id !== selected.id) {
            setSelectedStation(null);
        }
        setRoute(selected);
    };

    const confirmRoute = () => {
        if (!route) {
            return;
        }
        setStep(1);
        if (!route.isFull) {
            void loadSeats(route.id);
        }
    };

    // Submit a waitlist join for a full route (no seat map — seat is auto-assigned on promotion)
    const submitWaitlist = async (routeId: number, stationName: string) => {
        setSubmitting(true);
        try {
            const entry = await api<WaitlistEntryDto>("/api/student/waitlist", {
                method: "POST",
                body: { routeId, station: stationName },
            });
            setResult({ ok: true, kind: "waitlist", entry });
        } catch (error) {
            alert(error instanceof ApiError ? error.message : "候補登記失敗，請稍後再試");
            setResult({ ok: false });
        } finally {
            setSubmitting(false);
            setStep(3);
        }
    };

    // Step 1: confirm the picked station — full routes go to the waitlist instead of the seat map
    const confirmStation = () => {
        if (!route || !selectedStation) {
            return;
        }
        if (route.isFull) {
            const confirmed = window.confirm(
                `「${route.name}」座位已滿，是否加入候補名單（${selectedStation}）？`,
            );
            if (!confirmed) {
                return;
            }
            void submitWaitlist(route.id, selectedStation);
            return;
        }
        setStep(2);
    };

    // Re-sync route.isFull with the server — the route the student picked earlier in the
    // wizard may have filled up in the meantime, so a failed submit needs fresh data to
    // decide whether to offer the waitlist instead of just failing. Returns the fresh
    // isFull value (or null if the refresh failed / route disappeared) for the caller.
    const syncRouteFullness = async (routeId: number): Promise<boolean | null> => {
        try {
            const fresh = await api<RouteDto[]>("/api/public/routes");
            setRoutes(fresh);
            const match = fresh.find((r) => r.id === routeId);
            if (match) {
                setRoute((previous) => (previous ? { ...previous, isFull: match.isFull } : previous));
                return match.isFull;
            }
            return null;
        } catch {
            // 刷新失敗不影響主流程，retry() 頂多用舊資料再試一次
            return null;
        }
    };

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
            setResult({ ok: true, kind: "booking", booking });
        } catch (error) {
            const stillFull = await syncRouteFullness(route.id);
            if (stillFull) {
                const reason = error instanceof ApiError ? error.message : "此路線座位已滿";
                const confirmed = window.confirm(`${reason}，是否改為加入候補名單（${selectedStation}）？`);
                if (confirmed) {
                    await submitWaitlist(route.id, selectedStation);
                    return;
                }
            }
            alert(error instanceof ApiError ? error.message : "登記失敗，請稍後再試");
            setResult({ ok: false });
        } finally {
            setSubmitting(false);
            setPendingSeat(null);
            setSeatConfirmOpen(false);
            setStep(3);
        }
    };

    // Cancel the current waitlist entry
    const cancelWaitlist = async () => {
        if (!existingWaitlist) {
            return;
        }
        if (!window.confirm("確定要取消候補嗎？")) {
            return;
        }
        try {
            await api(`/api/student/waitlist/${existingWaitlist.id}`, { method: "DELETE" });
            setExistingWaitlist(null);
        } catch (error) {
            alert(error instanceof ApiError ? error.message : "取消候補失敗，請稍後再試");
        }
    };

    // Retry booking by resetting the result and step, and reloading seats if a route is selected
    const retry = () => {
        setResult(null);
        setPendingSeat(null);
        if (route?.isFull) {
            setStep(1);
            return;
        }
        setStep(2);
        if (route !== null) {
            void loadSeats(route.id);
        }
    };

    const gotoStep = (index: number) => {
        setPendingSeat(null);
        setStep(index);
    };

    const station = route?.stations.find((s) => s.name === selectedStation) ?? null;
    const succeeded = step === 3 && !!result?.ok;
    const bookedSeat = result?.ok && result.kind === "booking" ? result.booking.seatNumber : null;

    const steps = [
        { label: "選路線", sub: route ? route.name : "尚未選擇" },
        { label: "上車站", sub: selectedStation ?? "尚未選擇" },
        {
            label: "選座位",
            sub: bookedSeat ? `座位 ${bookedSeat}` : pendingSeat ? `座位 ${pendingSeat}` : "尚未選擇",
        },
        { label: "完成", sub: succeeded ? "已完成" : "確認後完成" },
    ];

    // 載入中：登記頁標題列 + 導覽列；登記流程中：隱藏導覽列專注在選位；
    // 無法登記（未開放、已登記、候補中、已完成）：改回一般標題列與導覽
    const canBook = !!window_?.open && !existing && !existingWaitlist && !succeeded;
    useBookingNav(loading ? "loading" : canBook ? "booking" : "blocked");

    if (loading) {
        return <PageLoader />;
    }

    // Not in booking time
    if (!window_?.open) {
        return (
            <StateCard
                icon={<span className="block size-11 rounded-lg border-[3px] border-faint" />}
                title="現在還不能登記"
            >
                {window_?.start && window_?.end ? (
                    <p>
                        開放時間：
                        <span className="font-semibold text-fg">
                            {formatDateTime(window_.start)} 至 {formatDateTime(window_.end)}
                        </span>
                    </p>
                ) : (
                    <p>開放時間請留意學校公告。</p>
                )}
                <Link href="/routes" className={primaryButton}>
                    先看路線
                </Link>
            </StateCard>
        );
    }

    // Already booked
    if (existing) {
        return (
            <StateCard
                icon={
                    <span className="grid size-16 place-items-center rounded-full bg-accent text-[28px] font-semibold text-ink">
                        {existing.seatNumber}
                    </span>
                }
                title="你已完成登記"
            >
                <p>
                    <span className="font-semibold text-fg">
                        {existing.route.name}，{existing.station}上車，座位 {existing.seatNumber} 號。
                    </span>
                    <br />
                    如需改選，請先在首頁取消原登記。
                </p>
                <Link href="/" className={primaryButton}>
                    回首頁看車票
                </Link>
            </StateCard>
        );
    }

    // Currently on a waitlist
    if (existingWaitlist) {
        return (
            <StateCard
                icon={
                    <span className="grid size-16 place-items-center rounded-full bg-fg text-ink">
                        <BusIcon className="size-8" />
                    </span>
                }
                title={`候補第 ${existingWaitlist.position} 位`}
            >
                <p>
                    <span className="font-semibold text-fg">
                        {existingWaitlist.route.name}，{existingWaitlist.station}上車。
                    </span>
                    <br />
                    有座位釋出時會依候補順序自動遞補。
                </p>
                <button type="button" onClick={() => void cancelWaitlist()} className={secondaryButton}>
                    取消候補
                </button>
            </StateCard>
        );
    }

    // Booking steps
    return (
        <div className="flex flex-col gap-4.5 md:gap-7">
            <Stepper steps={steps} current={succeeded ? steps.length : step} goto={step < 3 ? gotoStep : undefined} />

            {/* Step 0: Choose Route */}
            {step === 0 && (
                <>
                    <div className="flex flex-col gap-1 md:gap-1.5">
                        <h1 className="font-display text-[26px] leading-[1.3] font-bold md:text-[32px] md:leading-tight">
                            要搭哪一條路線？
                        </h1>
                        <p className="text-sm text-muted md:text-base">
                            選一條經過你家附近的路線，下一步再選上車站。
                        </p>
                    </div>

                    {/* No routes available */}
                    {routes.length === 0 && (
                        <p className="py-10 text-center text-lg text-muted">目前沒有開放登記的路線。</p>
                    )}

                    {/* Routes list */}
                    <ul
                        aria-label="路線"
                        className="grid grid-cols-1 gap-2.5 md:grid-cols-[repeat(auto-fit,minmax(260px,1fr))] md:gap-4"
                    >
                        {routes.map((item) => {
                            const selected = route?.id === item.id;

                            return (
                                <li key={item.id} className="flex">
                                    <button
                                        type="button"
                                        onClick={() => pickRoute(item)}
                                        aria-pressed={selected}
                                        className={`relative flex flex-1 flex-col items-start gap-2.5 rounded-[18px] border bg-surface px-4.5 pt-4.5 pb-4 text-left transition md:gap-4.5 md:rounded-card md:p-6 ${
                                            selected
                                                ? "border-fg ring-1 ring-fg"
                                                : "border-line hover:border-line-strong"
                                        }`}
                                    >
                                        {selected && (
                                            <span
                                                aria-hidden="true"
                                                className="absolute top-4 right-4 grid size-6 place-items-center rounded-full bg-accent text-ink md:top-4.5 md:right-4.5 md:size-7"
                                            >
                                                <CheckIcon className="size-3.5 md:size-4" />
                                            </span>
                                        )}

                                        <span className="pr-8 font-display text-xl font-bold md:text-[26px]">
                                            {item.name}
                                        </span>

                                        <span className="flex flex-col gap-1.5 text-sm text-fg2 md:text-[15px]">
                                            <span>{item.stations.length} 個停靠站</span>
                                            {item.stations[0] && <span>首站 {item.stations[0].arriveAt} 發車</span>}
                                            <span>月費 {priceRange(item)}</span>
                                        </span>

                                        {item.isFull ? (
                                            <span className="flex items-center gap-2 text-[13px] font-medium text-accent md:text-sm">
                                                <span
                                                    aria-hidden="true"
                                                    className="h-2.5 w-[11px] bg-accent [clip-path:polygon(50%_0,100%_100%,0_100%)]"
                                                />
                                                已滿，可登記候補
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2 text-[13px] font-medium md:text-sm">
                                                <span
                                                    aria-hidden="true"
                                                    className="size-2.5 rounded-full border-2 border-fg"
                                                />
                                                尚有座位
                                            </span>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>

                    <ActionBar>
                        <span className="hidden text-base text-fg2 md:block">
                            已選：<span className="font-bold text-fg">{route ? route.name : "尚未選擇"}</span>
                        </span>
                        <button type="button" disabled={!route} onClick={confirmRoute} className={primaryButton}>
                            下一步<span className="hidden md:inline">：選上車站</span>
                        </button>
                    </ActionBar>
                </>
            )}

            {/* Step 1: Choose Station */}
            {step === 1 && route && (
                <>
                    <div className="flex flex-col gap-1 md:gap-1.5">
                        <h1 className="font-display text-[26px] leading-[1.3] font-bold md:text-[32px] md:leading-tight">
                            從哪一站上車？
                        </h1>
                        <p className="text-sm text-muted md:text-base">
                            {route.name}的停靠站。月費依上車站不同。
                            {route.isFull && (
                                <span className="text-accent">此路線已滿位，選站後將加入候補名單。</span>
                            )}
                        </p>
                    </div>

                    {/* No stations available */}
                    {route.stations.length === 0 && (
                        <p className="py-10 text-center text-lg text-muted">這條路線目前沒有開放的站點。</p>
                    )}

                    {/* Stations timeline */}
                    <ol aria-label={`${route.name}停靠站`} className="flex max-w-[760px] flex-col">
                        {route.stations.map((s) => {
                            const selected = selectedStation === s.name;

                            return (
                                <li key={s.name} className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-3 md:gap-x-4">
                                    <span aria-hidden="true" className="relative flex justify-center">
                                        <span className="absolute inset-y-0 w-0.5 bg-line" />
                                        <span
                                            className={`relative rounded-full border-2 ${
                                                selected
                                                    ? "mt-[27px] size-4.5 border-accent bg-accent"
                                                    : "mt-[30px] size-3 border-fg bg-surface"
                                            }`}
                                        />
                                    </span>
                                    <span className="flex pb-2.5">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedStation(s.name)}
                                            aria-pressed={selected}
                                            className={`flex min-h-18 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-[18px] border bg-surface px-5 py-3.5 text-left transition ${
                                                selected
                                                    ? "border-fg ring-1 ring-fg"
                                                    : "border-line hover:border-line-strong"
                                            }`}
                                        >
                                            <span className="flex flex-col gap-0.5">
                                                <span className={`text-lg ${selected ? "font-bold" : "font-medium"}`}>
                                                    {s.name}
                                                </span>
                                                <span className="text-sm text-muted">{s.arriveAt} 到站</span>
                                            </span>
                                            <span className="font-medium">月費 {formatPrice(s.monthlyPrice)}</span>
                                        </button>
                                    </span>
                                </li>
                            );
                        })}

                        {/* Destination */}
                        {route.stations.length > 0 && (
                            <li className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-3 md:gap-x-4">
                                <span aria-hidden="true" className="relative flex justify-center">
                                    <span className="absolute top-0 h-6.5 w-0.5 bg-line" />
                                    <span className="relative mt-6 size-3.5 rounded-[3px] bg-fg" />
                                </span>
                                <span className="flex min-h-16 items-center gap-3 px-5">
                                    <span className="text-[17px] font-bold">鳳山高中</span>
                                    <span className="text-sm text-muted">抵達學校</span>
                                </span>
                            </li>
                        )}
                    </ol>

                    <ActionBar>
                        <button type="button" onClick={() => gotoStep(0)} className={secondaryButton}>
                            上一步
                        </button>
                        <span className="flex flex-1 flex-wrap items-center gap-5 md:flex-none">
                            {station && (
                                <span className="hidden text-base text-fg2 md:block">
                                    {station.name}上車，月費{" "}
                                    <span className="font-bold text-fg">{formatPrice(station.monthlyPrice)}</span>
                                </span>
                            )}
                            <button
                                type="button"
                                disabled={!selectedStation || submitting}
                                onClick={confirmStation}
                                className={primaryButton}
                            >
                                {route.isFull ? (
                                    submitting ? "送出中…" : "加入候補"
                                ) : (
                                    <>
                                        下一步<span className="hidden md:inline">：選座位</span>
                                    </>
                                )}
                            </button>
                        </span>
                    </ActionBar>
                </>
            )}

            {/* Step 2: Choose Seat */}
            {step === 2 && route && selectedStation && (
                <>
                    <div className="flex flex-col gap-1 md:gap-1.5">
                        <h1 className="font-display text-[26px] leading-[1.3] font-bold md:text-[32px] md:leading-tight">
                            挑一個位子
                        </h1>
                        <p className="text-sm text-muted md:text-base">
                            {route.name}，{selectedStation}上車。選好空位後按「確定」，再確認一次就完成登記。
                        </p>
                    </div>

                    {/* SeatMap */}
                    {seatsLoading ? (
                        <p className="py-10 text-center text-lg text-muted">座位載入中…</p>
                    ) : seatsError ? (
                        <div className="flex flex-col items-center gap-4 rounded-3xl border border-line py-12 text-center">
                            <p className="text-lg text-muted">座位載入失敗，請稍後再試。</p>
                            <button
                                type="button"
                                onClick={() => void loadSeats(route.id)}
                                className={secondaryButton}
                            >
                                重新載入
                            </button>
                        </div>
                    ) : (
                        <SeatMap
                            takenSeats={takenSeats}
                            selected={pendingSeat}
                            disabled={submitting}
                            onSelect={setPendingSeat}
                            onRefresh={() => void loadSeats(route.id)}
                        />
                    )}

                    <ActionBar>
                        <button type="button" onClick={() => gotoStep(1)} className={secondaryButton}>
                            上一步
                        </button>
                        {pendingSeat !== null && (
                            <span className="flex flex-1 flex-wrap items-center gap-5 md:flex-none">
                                <span className="hidden text-base text-fg2 md:block">
                                    已選座位 <span className="font-bold text-fg">{pendingSeat} 號</span>
                                </span>
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => setSeatConfirmOpen(true)}
                                    className={primaryButton}
                                >
                                    確定
                                </button>
                            </span>
                        )}
                    </ActionBar>
                </>
            )}

            {/* Step 3: Result */}
            {step === 3 && result && (
                <>
                    {result.ok && result.kind === "booking" ? (
                        // Booking success
                        <section className="relative mx-auto flex w-full max-w-[820px] flex-col gap-6 overflow-hidden rounded-[28px] border border-line p-6 md:gap-9 md:p-12">
                            <span
                                aria-hidden="true"
                                className="absolute -top-px -right-px size-28 rounded-bl-full bg-surface2 md:size-40"
                            />

                            <div className="relative flex flex-col items-start gap-4.5">
                                <span
                                    aria-hidden="true"
                                    className="grid size-14 place-items-center rounded-full bg-fg text-ink md:size-16"
                                >
                                    <CheckIcon className="size-7" />
                                </span>
                                <h1 className="font-display text-[30px] leading-tight font-bold md:text-[40px]">
                                    位子留給你了
                                </h1>
                                <p className="text-[15px] leading-[1.7] text-muted md:text-[17px]">
                                    登記完成，電子車票已經放在首頁，隨時可以查看。
                                </p>
                            </div>

                            <div className="relative flex">
                                <Link href="/" className={`${primaryButton} max-md:w-full max-md:flex-none`}>
                                    回首頁看車票
                                </Link>
                            </div>
                        </section>
                    ) : result.ok && result.kind === "waitlist" ? (
                        // Waitlist join success
                        <StateCard
                            icon={
                                <span className="grid size-16 place-items-center rounded-full bg-fg text-ink">
                                    <CheckIcon className="size-7" />
                                </span>
                            }
                            title="已加入候補名單"
                        >
                            <p>
                                <span className="font-semibold text-fg">
                                    {result.entry.route.name}，{result.entry.station}上車，目前候補第{" "}
                                    {result.entry.position} 位。
                                </span>
                                <br />
                                有座位釋出時會依候補順序自動遞補。
                            </p>
                            <Link href="/" className={primaryButton}>
                                回首頁
                            </Link>
                        </StateCard>
                    ) : (
                        // Booking fail
                        <StateCard
                            icon={
                                <span className="grid size-16 place-items-center rounded-full bg-accent text-[28px] font-semibold text-ink">
                                    !
                                </span>
                            }
                            title="登記失敗"
                        >
                            <p>這個位子可能剛被其他同學選走了，回去重新挑一個吧。</p>
                            <button type="button" onClick={retry} className={primaryButton}>
                                返回重新選位
                            </button>
                        </StateCard>
                    )}
                </>
            )}

            {/* Seat confirmation modal */}
            {step === 2 && route && selectedStation && pendingSeat !== null && seatConfirmOpen && (
                <div
                    onClick={() => !submitting && setSeatConfirmOpen(false)}
                    className="fixed inset-0 z-50 flex items-end justify-center bg-fg/30 md:items-center md:p-6"
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="confirm-title"
                        onClick={(e) => e.stopPropagation()}
                        className="relative flex w-full flex-col gap-5 overflow-hidden rounded-t-[28px] bg-surface px-6 pt-7 pb-8 shadow-card-lg max-md:animate-[sheet-up_240ms_ease-out] md:max-w-[420px] md:animate-[pop-in_180ms_ease-out] md:rounded-[28px] md:px-7 md:pt-8 md:pb-6"
                    >
                        <span
                            aria-hidden="true"
                            className="absolute -bottom-px -left-px size-24 rounded-tr-full bg-surface2"
                        />
                        <span className="relative grid size-18 place-items-center rounded-full bg-accent text-[32px] font-semibold text-ink">
                            {pendingSeat}
                        </span>
                        <div className="relative flex flex-col gap-2">
                            <h2 id="confirm-title" className="text-[22px] font-bold">
                                確定登記這個位子？
                            </h2>
                            <p className="text-[15px] leading-[1.7] text-fg2">
                                {route.name}，{selectedStation}上車，座位 {pendingSeat} 號。登記後在開放時間內仍可取消。
                            </p>
                        </div>
                        <div className="relative flex flex-col gap-2.5">
                            <button
                                type="button"
                                disabled={submitting}
                                onClick={() => void submit(pendingSeat)}
                                className="h-13.5 rounded-full bg-fg font-medium text-ink disabled:opacity-50"
                            >
                                {submitting ? "登記中…" : "確定登記"}
                            </button>
                            <button
                                type="button"
                                disabled={submitting}
                                onClick={() => setSeatConfirmOpen(false)}
                                className="h-13.5 rounded-full border-[1.5px] border-line bg-surface font-medium disabled:opacity-50"
                            >
                                再想想
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
