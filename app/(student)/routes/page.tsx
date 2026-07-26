"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import type { RouteDto } from "@/lib/types";
import { BusIcon, MapPinIcon } from "@/components/icons";

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
        <>
            <h1 className="text-2xl font-bold tracking-tight">路線資訊</h1>
            <p className="mt-1.5 text-sm text-muted">目前開放登記的路線與各站點發車時間。</p>

            <section className="mt-7 grid gap-4 md:grid-cols-2">
                {!loading && routes.length === 0 && (
                    <p className="col-span-full rounded-3xl border border-line bg-surface p-10 text-center text-sm text-muted">
                        目前沒有開放登記的路線。
                    </p>
                )}
                {loading && (
                    <p className="col-span-full py-10 text-center text-sm text-muted">載入中…</p>
                )}
                {routes.map((route) => (
                    <div key={route.id} className="rounded-3xl border border-line bg-surface p-6">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <span className="grid size-10 place-items-center rounded-xl bg-accent-wash text-accent-ink">
                                    <BusIcon className="size-5" />
                                </span>
                                <h2 className="text-base font-bold">{route.name}</h2>
                            </div>
                            {route.departAt && (
                                <span className="flex items-center gap-1 rounded-full bg-bg px-3 py-1.5 text-xs font-semibold text-muted">
                                    <MapPinIcon className="size-3.5" />
                                    {route.departAt} 發車
                                </span>
                            )}
                        </div>
                        <ul className="mt-5 space-y-0">
                            {route.stations.map((station, index) => (
                                <li key={station.name} className="relative flex gap-4 pb-5 last:pb-0">
                                    {index < route.stations.length - 1 && (
                                        <span className="absolute left-[5px] top-4 h-full w-0.5 bg-line" />
                                    )}
                                    <span className="relative mt-1.5 size-3 shrink-0 rounded-full border-2 border-accent bg-surface" />
                                    <div className="flex flex-1 items-center justify-between gap-3">
                                        <span className="text-sm font-medium">{station.name}</span>
                                        <span className="rounded-full bg-bg px-2.5 py-1 text-xs font-semibold text-muted">
                                            {station.time}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </section>
        </>
    );
}
