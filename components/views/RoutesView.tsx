"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/services/api";
import type { RouteDto } from "@/lib/types";

const SWIPE_THRESHOLD = 50;

function ChevronIcon({ direction, className }: { direction: "left" | "right"; className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={className}
        >
            <path d={direction === "left" ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6"} />
        </svg>
    );
}

// 路線與停靠站瀏覽（走公開 API，不需登入），供「路線」頁與登入頁的路線彈窗共用
export function RoutesView() {
    const [routes, setRoutes] = useState<RouteDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [index, setIndex] = useState(0);
    const [direction, setDirection] = useState<"left" | "right">("right");
    const touchStartX = useRef<number | null>(null);

    useEffect(() => {
        api<RouteDto[]>("/api/public/routes")
            .then(setRoutes)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const route = routes[index] ?? null;

    const goTo = (newIndex: number) => {
        setDirection(newIndex > index ? "right" : "left");
        setIndex(newIndex);
    };
    const handleTouchStart = (event: React.TouchEvent) => {
        touchStartX.current = event.touches[0].clientX;
    };
    const handleTouchEnd = (event: React.TouchEvent) => {
        if (touchStartX.current === null) {
            return;
        }
        const delta = event.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;

        if (delta > SWIPE_THRESHOLD && index > 0) {
            goTo(index - 1);
        } else if (delta < -SWIPE_THRESHOLD && index < routes.length - 1) {
            goTo(index + 1);
        }
    };

    return (
        <div className="flex flex-col gap-6.5">

            {loading && <p className="py-10 text-center text-sm text-muted">載入中…</p>}

            {!loading && routes.length === 0 && (
                <p className="rounded-card bg-surface p-10 text-center text-lg text-muted shadow-card">
                    目前沒有開放登記的路線。
                </p>
            )}

            {route && (
                <div className="flex flex-col gap-5">
                    {/* Route Info & Mobile Hint */}
                    <div className="text-center">
                        <p className="text-[clamp(32px,3vw,48px)] font-bold tracking-tight">{route.name}</p>

                        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2 text-muted">
                            {route.departAt && <span className="font-mono">{route.departAt} 發車</span>}
                            <span>{route.stations.length} 個停靠站</span>
                        </div>

                        <div className="md:hidden mt-1.5 flex flex-wrap items-center justify-center gap-2 text-lg">
                            左右滑動切換路線
                        </div>
                    </div>

                    {/* Route Switcher Dots */}
                    {routes.length > 1 && (
                        <div className="flex justify-center gap-3">
                            <div className="flex items-center gap-1.5">
                                {routes.map((r, i) => (
                                    <button
                                        key={r.id}
                                        type="button"
                                        onClick={() => goTo(i)}
                                        aria-label={r.name}
                                        className={`size-3 rounded-full transition ${
                                            i === index ? "bg-accent" : "bg-line"
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Desktop Route Switcher + Station List */}
                    <div className="flex items-center justify-center gap-2 md:gap-4">
                        {/* Previous Route Button */}
                        <button
                            type="button"
                            onClick={() => goTo(index - 1)}
                            disabled={index === 0}
                            aria-label="上一條路線"
                            aria-hidden={index === 0}
                            tabIndex={index === 0 ? -1 : undefined}
                            className={`hidden shrink-0 px-1 text-muted transition hover:text-fg md:grid md:place-items-center ${
                                index === 0 ? "invisible" : ""
                            }`}
                        >
                            <ChevronIcon direction="left" className="size-12" />
                        </button>

                        {/* Station List */}
                        <div
                            onTouchStart={handleTouchStart}
                            onTouchEnd={handleTouchEnd}
                            className="w-full max-w-md overflow-hidden"
                        >
                            <div
                                key={route.id}
                                className={`rounded-card bg-surface p-6 shadow-card ${
                                    direction === "right"
                                        ? "animate-[slide-in-from-right_260ms_ease-out]"
                                        : "animate-[slide-in-from-left_260ms_ease-out]"
                                }`}
                            >
                                {route.stations.map((station, i) => {
                                    const last = i === route.stations.length - 1;
                                    const edge = i === 0 || last;
                                    return (
                                        <div key={station.name} className="flex gap-4">
                                            {/* Timeline */}
                                            <div className="flex flex-col items-center">
                                                <span
                                                    className={`size-3 shrink-0 rounded-full ${
                                                        edge ? "bg-accent" : "bg-muted opacity-50"
                                                    }`}
                                                />
                                                {!last && <span className="w-px flex-1 bg-line" />}
                                            </div>

                                            {/* Station Info */}
                                            <div
                                                className={`flex flex-1 items-center justify-between gap-3 ${last ? "pb-0" : "pb-6"}`}
                                            >
                                                <p
                                                    className={`mr-8 font-mono text-lg md:text-xl ${edge ? "font-medium" : "text-muted"}`}
                                                >
                                                    {station.name}
                                                </p>
                                                <p className="font-mono text-lg">{station.arriveAt}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Next Route Button */}
                        <button
                            type="button"
                            onClick={() => goTo(index + 1)}
                            disabled={index === routes.length - 1}
                            aria-label="下一條路線"
                            aria-hidden={index === routes.length - 1}
                            tabIndex={index === routes.length - 1 ? -1 : undefined}
                            className={`hidden shrink-0 px-1 text-muted transition hover:text-fg md:grid md:place-items-center ${
                                index === routes.length - 1 ? "invisible" : ""
                            }`}
                        >
                            <ChevronIcon direction="right" className="size-12" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
