"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import type { RouteDto } from "@/lib/types";

export default function RoutesPage() {
    const [routes, setRoutes] = useState<RouteDto[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api<RouteDto[]>("/api/student/routes")
            .then(setRoutes)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="flex flex-col gap-6.5">
            <div>
                <p className="font-mono text-[11px] tracking-wide text-muted uppercase">路線時刻</p>
                <h1 className="mt-2 text-[clamp(24px,4vw,36px)] leading-tight font-bold tracking-tight">
                    每天下午，
                    <br />
                    載你回家的路線。
                </h1>
                <p className="mt-3 max-w-[44ch] text-[14.5px] leading-relaxed text-muted">
                    目前開放登記的路線與各站點發車時間。
                </p>
            </div>

            {loading && <p className="py-10 text-center text-sm text-muted">載入中…</p>}
            {!loading && routes.length === 0 && (
                <p className="rounded-card bg-surface p-10 text-center text-sm text-muted shadow-card">
                    目前沒有開放登記的路線。
                </p>
            )}

            {routes.map((route) => (
                <div
                    key={route.id}
                    className="grid grid-cols-1 gap-4.5 border-t border-line py-6 sm:grid-cols-[220px_1fr] sm:gap-8"
                >
                    <div className="flex flex-col gap-2.5">
                        <p className="text-[clamp(20px,3vw,26px)] font-bold tracking-tight">{route.name}</p>
                        {route.departAt && (
                            <p className="font-mono text-[13px] text-muted">{route.departAt} 發車</p>
                        )}
                        <span className="w-fit rounded-full bg-surface2 px-2.5 py-1 font-mono text-[11px] text-muted">
                            {route.stations.length} 個停靠站
                        </span>
                    </div>
                    <div className="min-w-0">
                        {route.stations.map((station, index) => {
                            const edge = index === 0 || index === route.stations.length - 1;
                            return (
                                <div key={station.name} className="flex items-start gap-3.5">
                                    <span className="relative flex w-3 justify-center self-stretch">
                                        <span
                                            className={`absolute w-px bg-line ${
                                                index === 0
                                                    ? "top-1/2 bottom-0"
                                                    : index === route.stations.length - 1
                                                      ? "top-0 bottom-1/2"
                                                      : "top-0 bottom-0"
                                            }`}
                                        />
                                        <span
                                            className={`relative mt-2.5 size-1.5 rounded-full ${
                                                edge ? "bg-accent" : "bg-muted opacity-50"
                                            }`}
                                        />
                                    </span>
                                    <div className="flex flex-wrap items-baseline gap-2.5 py-1 pb-3.5">
                                        <span className="w-11 shrink-0 font-mono text-[13px] text-muted">
                                            {station.time}
                                        </span>
                                        <span
                                            className={
                                                edge ? "text-base font-medium" : "text-sm text-muted"
                                            }
                                        >
                                            {station.name}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
