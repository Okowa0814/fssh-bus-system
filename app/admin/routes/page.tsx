"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { api, ApiError } from "@/services/api";
import type { StationDto } from "@/lib/types";
import { PlusIcon, SaveIcon, TrashIcon } from "@/components/icons";

type EditableStation = StationDto & { key: string };

interface AdminRoute {
    id: number;
    name: string;
    stations: EditableStation[];
}

const underlineInput =
    "min-w-0 rounded-none border-0 border-b border-line bg-transparent px-1 py-1 outline-none transition focus:border-accent";

function PillButton({
    onClick,
    disabled,
    label,
    icon,
    danger,
}: {
    onClick: () => void;
    disabled?: boolean;
    label: string;
    icon: ReactNode;
    danger?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`flex shrink-0 items-center justify-center gap-1.5 rounded-field px-3 py-1.5 text-sm font-medium transition disabled:opacity-40 ${
                danger ? "bg-danger-wash text-danger-ink hover:opacity-80" : "bg-fg text-bg hover:opacity-90"
            }`}
        >
            {icon}
            {label}
        </button>
    );
}

export default function AdminRoutesPage() {
    const [routes, setRoutes] = useState<AdminRoute[]>([]);
    const [savingId, setSavingId] = useState<number | null>(null);
    const [dragStation, setDragStation] = useState<{ routeId: number; index: number } | null>(null);
    const trackRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        api<{ id: number; name: string; stations: StationDto[] }[]>("/api/admin/routes")
            .then((data) =>
                setRoutes(
                    data.map((route) => ({
                        id: route.id,
                        name: route.name,
                        stations: route.stations.map((station) => ({
                            ...station,
                            key: crypto.randomUUID(),
                        })),
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
                    ? {
                          ...route,
                          stations: [
                              ...route.stations,
                              { name: "", arriveAt: "", monthlyPrice: 0, key: crypto.randomUUID() },
                          ],
                      }
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

    const handleStationDrop = (routeId: number, dropIndex: number) => {
        setRoutes((previous) => {
            if (!dragStation || dragStation.routeId !== routeId || dragStation.index === dropIndex) {
                return previous;
            }
            return previous.map((route) => {
                if (route.id !== routeId) {
                    return route;
                }
                const stations = [...route.stations];
                const [moved] = stations.splice(dragStation.index, 1);
                stations.splice(dropIndex, 0, moved);
                return { ...route, stations };
            });
        });
        setDragStation(null);
    };

    const save = async (route: AdminRoute) => {
        setSavingId(route.id);
        try {
            await api(`/api/admin/routes/${route.id}`, {
                method: "PATCH",
                body: {
                    name: route.name,
                    stations: route.stations.map(({ key: _key, ...station }) => ({
                        ...station,
                        monthlyPrice: Number.isFinite(station.monthlyPrice) ? station.monthlyPrice : 0,
                    })),
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
            const created = await api<{ id: number; name: string; stations: StationDto[] }>(
                "/api/admin/routes",
                { method: "POST", body: { name: "新路線", stations: [] } },
            );
            setRoutes((previous) => [
                ...previous,
                {
                    id: created.id,
                    name: created.name,
                    stations: created.stations.map((station) => ({
                        ...station,
                        key: crypto.randomUUID(),
                    })),
                },
            ]);
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
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                {/* Title */}
                <h1 className="mt-2 text-[clamp(24px,3vw,32px)] font-bold tracking-tight">車輛與停靠站</h1>

                {/* Add route button */}
                <button
                    type="button"
                    onClick={addRoute}
                    className="shrink-0 rounded-field bg-fg px-4 py-2.5 font-medium text-bg transition hover:opacity-90"
                >
                    ＋ 新增路線
                </button>
            </div>

            <div ref={trackRef} className="flex gap-4 overflow-x-auto pb-2">               
                {routes.length === 0 ? (
                    <p className="w-full rounded-card bg-surface p-10 text-center text-muted shadow-card">
                        還沒有任何路線，點右上角「新增路線」開始建立。
                    </p>
                ):(
                    routes.map((route) => (
                    <section
                        key={route.id}
                        className="w-100 shrink-0 rounded-card border border-line bg-surface p-5.5"
                    >

                        {/* Route name */}
                        <input
                            value={route.name}
                            onChange={(event) => patchRoute(route.id, { name: event.target.value })}
                            className={`w-fit text-2xl font-bold ${underlineInput}`}
                        />

                        {/* 刪除路線 / 新增站點 / 儲存變更 */}
                        <div className="flex items-start mt-4 gap-1.5 justify-center">
                            <PillButton
                                label="站點"
                                icon={<PlusIcon className="size-3.5" />}
                                onClick={() => addStation(route.id)}
                            />
                            <PillButton
                                label="儲存"
                                icon={<SaveIcon className="size-3.5" />}
                                disabled={savingId === route.id}
                                onClick={() => void save(route)}
                            />
                            <PillButton
                                label="刪除"
                                danger
                                icon={<TrashIcon className="size-3.5" />}
                                onClick={() => removeRoute(route)}
                            />
                        </div>
                        

                        <p className="mt-5 text-xs font-semibold text-muted">站點（可拖曳排序）</p>
                        <ul className="mt-2.5 flex max-h-[520px] flex-col gap-2 overflow-y-auto pr-1">
                            {route.stations.map((station, index) => (
                                <li
                                    key={station.key}
                                    draggable
                                    onDragStart={() => setDragStation({ routeId: route.id, index })}
                                    onDragOver={(event) => event.preventDefault()}
                                    onDrop={() => handleStationDrop(route.id, index)}
                                    onDragEnd={() => setDragStation(null)}
                                    className={`flex flex-col gap-2 rounded-field border border-line px-3 py-2.5 transition ${
                                        dragStation?.routeId === route.id && dragStation.index === index
                                            ? "opacity-40"
                                            : ""
                                    }`}
                                >
                                    {/* Row 1: 拖曳把手、序號、站名、刪除 */}
                                    <div className="flex items-center gap-1.5">
                                        <span className="shrink-0 cursor-grab select-none text-muted" title="拖曳排序">
                                            ⠿
                                        </span>

                                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface2 font-mono text-muted">
                                            {index + 1}
                                        </span>

                                        <input
                                            value={station.name}
                                            placeholder="站名"
                                            onChange={(event) => patchStation(route.id, index, { name: event.target.value })}
                                            className={`min-w-0 flex-1 font-medium ${underlineInput}`}
                                        />

                                        <button
                                            type="button"
                                            aria-label="刪除站點"
                                            title="刪除站點"
                                            onClick={() => removeStation(route.id, index)}
                                            className="grid size-6.5 shrink-0 place-items-center rounded-full text-danger-ink transition hover:bg-danger-wash"
                                        >
                                            <TrashIcon className="size-5" />
                                        </button>
                                    </div>

                                    {/* Row 2: 到站時間、月金額 */}
                                    <div className="flex items-center gap-3 pl-11">
                                        <input
                                            type="time"
                                            value={station.arriveAt}
                                            onChange={(event) => patchStation(route.id, index, { arriveAt: event.target.value })}
                                            className={`w-24 shrink-0 font-mono  text-muted ${underlineInput}`}
                                        />
                                        <div className="flex w-20 shrink-0 items-center gap-0.5">
                                            <span className="text-xs text-muted">$</span>
                                            <input
                                                type="number"
                                                min={0}
                                                value={Number.isNaN(station.monthlyPrice) ? "" : station.monthlyPrice}
                                                placeholder="月金額"
                                                onChange={(event) =>
                                                    patchStation(route.id, index, {
                                                        monthlyPrice: event.target.valueAsNumber,
                                                    })
                                                }
                                                className={`w-full font-mono ${underlineInput}`}
                                            />
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                    ))
                )}

            </div>
        </div>
    );
}
