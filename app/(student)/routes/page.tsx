"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { StationTimeline } from "@/components/StationTimeline";
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
                <p className="font-mono text-[11px] tracking-wide text-muted uppercase">路線總覽</p>
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
                <div key={route.id} className="flex flex-col gap-4 border-t border-line py-6">
                    <div className="flex flex-wrap items-center gap-3">
                        <p className="text-[clamp(20px,3vw,26px)] font-bold tracking-tight">{route.name}</p>
                        {route.departAt && (
                            <p className="font-mono text-[13px] text-muted">{route.departAt} 發車</p>
                        )}
                        <span className="w-fit rounded-full bg-surface2 px-2.5 py-1 font-mono text-[11px] text-muted">
                            {route.stations.length} 個停靠站
                        </span>
                    </div>
                    <StationTimeline stations={route.stations} />
                </div>
            ))}
        </div>
    );
}
