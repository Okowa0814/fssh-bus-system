"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/services/api";
import type { StationDto } from "@/lib/types";

interface AdminRoute {
    id: number;
    name: string;
    departAt: string;
    enabled: boolean;
    stations: StationDto[];
}

function Toggle({ on, onChange }: { on: boolean; onChange: (next: boolean) => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            onClick={() => onChange(!on)}
            className={`relative h-5.5 w-9.5 shrink-0 rounded-full p-0.5 transition ${
                on ? "bg-accent" : "bg-line"
            }`}
        >
            <span
                className={`block size-4.5 rounded-full bg-ink shadow transition-all ${
                    on ? "translate-x-4" : "translate-x-0"
                }`}
            />
        </button>
    );
}

function GlyphButton({
    onClick,
    disabled,
    label,
    danger,
    children,
}: {
    onClick: () => void;
    disabled?: boolean;
    label: string;
    danger?: boolean;
    children: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            title={label}
            className={`grid size-6.5 shrink-0 place-items-center rounded-lg text-[13px] transition disabled:opacity-30 ${
                danger ? "text-danger-ink hover:bg-danger-wash" : "text-muted hover:bg-surface2 hover:text-fg"
            }`}
        >
            {children}
        </button>
    );
}

export default function AdminRoutesPage() {
    const [routes, setRoutes] = useState<AdminRoute[]>([]);
    const [savingId, setSavingId] = useState<number | null>(null);

    useEffect(() => {
        api<AdminRoute[]>("/api/admin/routes")
            .then((data) =>
                setRoutes(
                    data.map((route) => ({
                        id: route.id,
                        name: route.name,
                        departAt: route.departAt ?? "",
                        enabled: route.enabled,
                        stations: route.stations,
                    })),
                ),
            )
            .catch(() => {});
    }, []);

    const patchRoute = (id: number, patch: Partial<AdminRoute>) => {
        setRoutes((previous) =>
            previous.map((route) => (route.id === id ? { ...route, ...patch } : route)),
        );
    };

    const patchStation = (routeId: number, index: number, patch: Partial<StationDto>) => {
        setRoutes((previous) =>
            previous.map((route) =>
                route.id === routeId
                    ? {
                          ...route,
                          stations: route.stations.map((station, i) =>
                              i === index ? { ...station, ...patch } : station,
                          ),
                      }
                    : route,
            ),
        );
    };

    const addStation = (routeId: number) => {
        setRoutes((previous) =>
            previous.map((route) =>
                route.id === routeId
                    ? { ...route, stations: [...route.stations, { name: "", time: "", enabled: true }] }
                    : route,
            ),
        );
    };

    const removeStation = (routeId: number, index: number) => {
        setRoutes((previous) =>
            previous.map((route) =>
                route.id === routeId
                    ? { ...route, stations: route.stations.filter((_, i) => i !== index) }
                    : route,
            ),
        );
    };

    const moveStation = (routeId: number, index: number, direction: -1 | 1) => {
        setRoutes((previous) =>
            previous.map((route) => {
                if (route.id !== routeId) {
                    return route;
                }
                const target = index + direction;
                if (target < 0 || target >= route.stations.length) {
                    return route;
                }
                const stations = [...route.stations];
                [stations[index], stations[target]] = [stations[target], stations[index]];
                return { ...route, stations };
            }),
        );
    };

    const save = async (route: AdminRoute) => {
        setSavingId(route.id);
        try {
            await api(`/api/admin/routes/${route.id}`, {
                method: "PATCH",
                body: {
                    name: route.name,
                    departAt: route.departAt,
                    enabled: route.enabled,
                    stations: route.stations,
                },
            });
            alert(`「${route.name}」已儲存`);
        } catch (error) {
            alert(error instanceof ApiError ? error.message : "儲存失敗，請稍後再試");
        } finally {
            setSavingId(null);
        }
    };

    const addRoute = async () => {
        try {
            const created = await api<AdminRoute>("/api/admin/routes", {
                method: "POST",
                body: { name: "新路線", stations: [] },
            });
            setRoutes((previous) => [...previous, { ...created, departAt: created.departAt ?? "" }]);
        } catch (error) {
            alert(error instanceof ApiError ? error.message : "新增路線失敗，請稍後再試");
        }
    };

    const removeRoute = async (route: AdminRoute) => {
        if (!window.confirm(`確定要刪除「${route.name}」這條路線嗎？此動作無法復原。`)) {
            return;
        }
        try {
            await api(`/api/admin/routes/${route.id}`, { method: "DELETE" });
            setRoutes((previous) => previous.filter((r) => r.id !== route.id));
            alert(`「${route.name}」已刪除`);
        } catch (error) {
            alert(error instanceof ApiError ? error.message : "刪除失敗，請稍後再試");
        }
    };

    return (
        <div className="flex flex-col gap-5.5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="font-mono text-[11px] tracking-wide text-muted uppercase">路線管理</p>
                    <h1 className="mt-2 text-[clamp(20px,3vw,26px)] font-bold tracking-tight">車輛與停靠站</h1>
                    <p className="mt-1.5 text-sm text-muted">
                        新增、刪除路線，調整站點順序與發車時間，停用的路線／站點不會顯示給學生。
                    </p>
                </div>
                <button
                    type="button"
                    onClick={addRoute}
                    className="shrink-0 rounded-field bg-fg px-4 py-2.5 text-sm font-medium text-bg transition hover:opacity-90"
                >
                    ＋ 新增路線
                </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                {routes.length === 0 && (
                    <p className="col-span-full rounded-card bg-surface p-10 text-center text-sm text-muted shadow-card">
                        還沒有任何路線，點右上角「新增路線」開始建立。
                    </p>
                )}
                {routes.map((route) => (
                    <section key={route.id} className="min-w-0 rounded-card border border-line bg-surface p-5.5">
                        <div className="flex flex-wrap items-center gap-3">
                            <input
                                value={route.name}
                                onChange={(event) => patchRoute(route.id, { name: event.target.value })}
                                className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-base font-bold outline-none transition focus:border-accent focus:bg-surface2"
                            />
                            <div className="flex shrink-0 items-center gap-2 text-xs text-muted">
                                <span className="hidden sm:inline">{route.enabled ? "營運中" : "已停開"}</span>
                                <Toggle on={route.enabled} onChange={(next) => patchRoute(route.id, { enabled: next })} />
                                <GlyphButton label="刪除路線" danger onClick={() => removeRoute(route)}>
                                    ×
                                </GlyphButton>
                            </div>
                        </div>

                        <div className="mt-3.5 flex items-center gap-2">
                            <label className="shrink-0 text-xs font-semibold text-muted">發車時間</label>
                            <input
                                value={route.departAt}
                                onChange={(event) => patchRoute(route.id, { departAt: event.target.value })}
                                placeholder="17:10"
                                className="w-24 min-w-0 rounded-lg border border-line bg-transparent px-2.5 py-1.5 font-mono text-sm outline-none transition focus:border-accent"
                            />
                        </div>

                        <p className="mt-5 text-xs font-semibold text-muted">站點（依發車順序）</p>
                        <ul className="mt-2.5 flex flex-col gap-2">
                            {route.stations.map((station, index) => (
                                <li
                                    key={index}
                                    className={`flex flex-wrap items-center gap-1 rounded-field border border-line px-3 py-2.5 transition ${
                                        station.enabled ? "" : "opacity-50"
                                    }`}
                                >
                                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface2 font-mono text-xs text-muted">
                                        {index + 1}
                                    </span>
                                    <input
                                        value={station.name}
                                        placeholder="站名"
                                        onChange={(event) => patchStation(route.id, index, { name: event.target.value })}
                                        className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-medium outline-none transition focus:border-accent focus:bg-surface2"
                                    />
                                    <input
                                        value={station.time}
                                        placeholder="時間"
                                        onChange={(event) => patchStation(route.id, index, { time: event.target.value })}
                                        className="w-16 shrink-0 rounded-lg border border-transparent bg-transparent px-2 py-1 text-center font-mono text-xs text-muted outline-none transition focus:border-accent focus:bg-surface2"
                                    />
                                    <Toggle
                                        on={station.enabled}
                                        onChange={(next) => patchStation(route.id, index, { enabled: next })}
                                    />
                                    <GlyphButton
                                        label="上移"
                                        disabled={index === 0}
                                        onClick={() => moveStation(route.id, index, -1)}
                                    >
                                        ↑
                                    </GlyphButton>
                                    <GlyphButton
                                        label="下移"
                                        disabled={index === route.stations.length - 1}
                                        onClick={() => moveStation(route.id, index, 1)}
                                    >
                                        ↓
                                    </GlyphButton>
                                    <GlyphButton label="刪除站點" danger onClick={() => removeStation(route.id, index)}>
                                        ×
                                    </GlyphButton>
                                </li>
                            ))}
                        </ul>
                        <button
                            type="button"
                            onClick={() => addStation(route.id)}
                            className="mt-2.5 w-full rounded-field border border-dashed border-line px-4 py-2 text-xs font-semibold text-muted transition hover:border-accent hover:text-accent-ink"
                        >
                            ＋ 新增停靠站
                        </button>

                        <button
                            type="button"
                            onClick={() => save(route)}
                            disabled={savingId === route.id}
                            className="mt-4 w-full rounded-field bg-fg px-5 py-2.5 text-sm font-medium text-bg transition disabled:opacity-40"
                        >
                            {savingId === route.id ? "儲存中…" : "儲存變更"}
                        </button>
                    </section>
                ))}
            </div>
        </div>
    );
}
