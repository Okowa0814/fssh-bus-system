"use client";

import { useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "@/services/api";
import type { StationDto, ScheduleDto } from "@/lib/types";
import { BusIcon, PlusIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon } from "@/components/icons";

interface AdminRoute {
    id: number;
    name: string;
    enabled: boolean;
    stations: StationDto[];
    schedules: ScheduleDto[];
}

interface ScheduleDraft {
    label: string;
    departAt: string;
}

function Toggle({ on, onChange }: { on: boolean; onChange: (next: boolean) => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            onClick={() => onChange(!on)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                on ? "bg-accent" : "bg-line"
            }`}
        >
            <span
                className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
                    on ? "left-[22px]" : "left-0.5"
                }`}
            />
        </button>
    );
}

function IconButton({
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
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            title={label}
            className={`grid size-7 shrink-0 place-items-center rounded-lg transition disabled:opacity-30 ${
                danger
                    ? "text-danger-ink hover:bg-danger-wash"
                    : "text-muted hover:bg-bg hover:text-fg"
            }`}
        >
            {children}
        </button>
    );
}

export default function AdminRoutesPage() {
    const [routes, setRoutes] = useState<AdminRoute[]>([]);
    const [savingId, setSavingId] = useState<number | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [scheduleDrafts, setScheduleDrafts] = useState<Record<number, ScheduleDraft>>({});

    useEffect(() => {
        api<AdminRoute[]>("/api/admin/routes")
            .then((data) =>
                setRoutes(
                    data.map((route) => ({
                        id: route.id,
                        name: route.name,
                        enabled: route.enabled,
                        stations: route.stations,
                        schedules: route.schedules ?? [],
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
        setNotice(null);
        try {
            await api(`/api/admin/routes/${route.id}`, {
                method: "PATCH",
                body: { name: route.name, enabled: route.enabled, stations: route.stations },
            });
            setNotice(`「${route.name}」已儲存`);
        } catch (error) {
            setNotice(error instanceof ApiError ? error.message : "儲存失敗，請稍後再試");
        } finally {
            setSavingId(null);
        }
    };

    const addRoute = async () => {
        setNotice(null);
        try {
            const created = await api<AdminRoute>("/api/admin/routes", {
                method: "POST",
                body: { name: "新路線", stations: [] },
            });
            setRoutes((previous) => [
                ...previous,
                { ...created, schedules: created.schedules ?? [] },
            ]);
        } catch (error) {
            setNotice(error instanceof ApiError ? error.message : "新增路線失敗，請稍後再試");
        }
    };

    const removeRoute = async (route: AdminRoute) => {
        if (!window.confirm(`確定要刪除「${route.name}」這條路線嗎？此動作無法復原。`)) {
            return;
        }
        setNotice(null);
        try {
            await api(`/api/admin/routes/${route.id}`, { method: "DELETE" });
            setRoutes((previous) => previous.filter((r) => r.id !== route.id));
            setNotice(`「${route.name}」已刪除`);
        } catch (error) {
            setNotice(error instanceof ApiError ? error.message : "刪除失敗，請稍後再試");
        }
    };

    const draftFor = (routeId: number): ScheduleDraft =>
        scheduleDrafts[routeId] ?? { label: "", departAt: "" };

    const setDraft = (routeId: number, patch: Partial<ScheduleDraft>) => {
        setScheduleDrafts((previous) => ({
            ...previous,
            [routeId]: { ...draftFor(routeId), ...patch },
        }));
    };

    const addSchedule = async (routeId: number) => {
        const draft = draftFor(routeId);
        if (!draft.label.trim() || !draft.departAt.trim()) {
            return;
        }
        setNotice(null);
        try {
            const schedule = await api<ScheduleDto>("/api/admin/schedules", {
                method: "POST",
                body: { routeId, label: draft.label.trim(), departAt: draft.departAt.trim() },
            });
            setRoutes((previous) =>
                previous.map((route) =>
                    route.id === routeId
                        ? { ...route, schedules: [...route.schedules, schedule] }
                        : route,
                ),
            );
            setDraft(routeId, { label: "", departAt: "" });
        } catch (error) {
            setNotice(error instanceof ApiError ? error.message : "新增班次失敗，請稍後再試");
        }
    };

    const removeSchedule = async (routeId: number, schedule: ScheduleDto) => {
        if (!window.confirm(`確定要刪除「${schedule.label}」這個班次嗎？`)) {
            return;
        }
        setNotice(null);
        try {
            await api(`/api/admin/schedules/${schedule.id}`, { method: "DELETE" });
            setRoutes((previous) =>
                previous.map((route) =>
                    route.id === routeId
                        ? { ...route, schedules: route.schedules.filter((s) => s.id !== schedule.id) }
                        : route,
                ),
            );
        } catch (error) {
            setNotice(error instanceof ApiError ? error.message : "刪除班次失敗，請稍後再試");
        }
    };

    return (
        <>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">路線管理</h1>
                    <p className="mt-1.5 text-sm text-muted">
                        新增、刪除路線與班次，調整站點順序，停用的路線／站點不會顯示給學生。
                    </p>
                </div>
                <button
                    type="button"
                    onClick={addRoute}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                >
                    <PlusIcon className="size-4" />
                    新增路線
                </button>
            </div>

            {notice && (
                <p className="mt-4 rounded-xl bg-accent-wash px-4 py-3 text-sm text-accent-ink">
                    {notice}
                </p>
            )}

            <div className="mt-7 grid gap-5 lg:grid-cols-2">
                {routes.length === 0 && (
                    <p className="col-span-full rounded-3xl border border-line bg-surface p-10 text-center text-sm text-muted">
                        還沒有任何路線，點右上角「新增路線」開始建立。
                    </p>
                )}
                {routes.map((route) => (
                    <section key={route.id} className="rounded-3xl border border-line bg-surface p-6">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <span
                                    className={`grid size-10 place-items-center rounded-xl ${
                                        route.enabled
                                            ? "bg-accent-wash text-accent-ink"
                                            : "bg-bg text-muted"
                                    }`}
                                >
                                    <BusIcon className="size-5" />
                                </span>
                                <input
                                    value={route.name}
                                    onChange={(event) =>
                                        patchRoute(route.id, { name: event.target.value })
                                    }
                                    className="w-32 rounded-lg border border-transparent bg-transparent px-2 py-1 text-base font-bold outline-none transition focus:border-accent focus:bg-bg"
                                />
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted">
                                {route.enabled ? "營運中" : "已停開"}
                                <Toggle
                                    on={route.enabled}
                                    onChange={(next) => patchRoute(route.id, { enabled: next })}
                                />
                                <IconButton label="刪除路線" danger onClick={() => removeRoute(route)}>
                                    <TrashIcon className="size-4" />
                                </IconButton>
                            </div>
                        </div>

                        <p className="mt-5 text-xs font-semibold text-muted">站點（依發車順序）</p>
                        <ul className="mt-2.5 space-y-2.5">
                            {route.stations.map((station, index) => (
                                <li
                                    key={index}
                                    className={`flex items-center gap-1.5 rounded-2xl border border-line px-3 py-2.5 transition ${
                                        station.enabled ? "" : "opacity-50"
                                    }`}
                                >
                                    <div className="flex flex-col">
                                        <IconButton
                                            label="上移"
                                            disabled={index === 0}
                                            onClick={() => moveStation(route.id, index, -1)}
                                        >
                                            <ChevronUpIcon className="size-3.5" />
                                        </IconButton>
                                        <IconButton
                                            label="下移"
                                            disabled={index === route.stations.length - 1}
                                            onClick={() => moveStation(route.id, index, 1)}
                                        >
                                            <ChevronDownIcon className="size-3.5" />
                                        </IconButton>
                                    </div>
                                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-bg text-xs font-semibold text-muted">
                                        {index + 1}
                                    </span>
                                    <input
                                        value={station.name}
                                        placeholder="站名"
                                        onChange={(event) =>
                                            patchStation(route.id, index, {
                                                name: event.target.value,
                                            })
                                        }
                                        className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-medium outline-none transition focus:border-accent focus:bg-bg"
                                    />
                                    <input
                                        value={station.time}
                                        placeholder="時間"
                                        onChange={(event) =>
                                            patchStation(route.id, index, {
                                                time: event.target.value,
                                            })
                                        }
                                        className="w-16 rounded-lg border border-transparent bg-transparent px-2 py-1 text-center text-xs text-muted outline-none transition focus:border-accent focus:bg-bg"
                                    />
                                    <Toggle
                                        on={station.enabled}
                                        onChange={(next) =>
                                            patchStation(route.id, index, { enabled: next })
                                        }
                                    />
                                    <IconButton
                                        label="刪除站點"
                                        danger
                                        onClick={() => removeStation(route.id, index)}
                                    >
                                        <TrashIcon className="size-3.5" />
                                    </IconButton>
                                </li>
                            ))}
                        </ul>
                        <button
                            type="button"
                            onClick={() => addStation(route.id)}
                            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line px-4 py-2 text-xs font-semibold text-muted transition hover:border-accent hover:text-accent-ink"
                        >
                            <PlusIcon className="size-3.5" />
                            新增站點
                        </button>

                        <button
                            type="button"
                            onClick={() => save(route)}
                            disabled={savingId === route.id}
                            className="mt-5 w-full rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                        >
                            {savingId === route.id ? "儲存中…" : "儲存變更"}
                        </button>

                        <p className="mt-6 text-xs font-semibold text-muted">班次</p>
                        <ul className="mt-2.5 space-y-2">
                            {route.schedules.length === 0 && (
                                <li className="rounded-xl bg-bg px-3 py-2.5 text-xs text-muted">
                                    尚未設定班次，學生無法登記此路線。
                                </li>
                            )}
                            {route.schedules.map((schedule) => (
                                <li
                                    key={schedule.id}
                                    className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2"
                                >
                                    <span className="text-sm font-medium">
                                        {schedule.label}
                                        <span className="ml-2 text-xs text-muted">{schedule.departAt}</span>
                                    </span>
                                    <IconButton
                                        label="刪除班次"
                                        danger
                                        onClick={() => removeSchedule(route.id, schedule)}
                                    >
                                        <TrashIcon className="size-3.5" />
                                    </IconButton>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-2.5 flex items-center gap-2">
                            <input
                                value={draftFor(route.id).label}
                                onChange={(event) => setDraft(route.id, { label: event.target.value })}
                                placeholder="班次名稱，如：放學班次"
                                className="min-w-0 flex-1 rounded-lg border border-line bg-transparent px-2.5 py-1.5 text-xs outline-none transition focus:border-accent"
                            />
                            <input
                                value={draftFor(route.id).departAt}
                                onChange={(event) => setDraft(route.id, { departAt: event.target.value })}
                                placeholder="17:10"
                                className="w-16 rounded-lg border border-line bg-transparent px-2.5 py-1.5 text-center text-xs outline-none transition focus:border-accent"
                            />
                            <IconButton label="新增班次" onClick={() => addSchedule(route.id)}>
                                <PlusIcon className="size-4" />
                            </IconButton>
                        </div>
                    </section>
                ))}
            </div>
        </>
    );
}
