"use client";

import type { StationDto } from "@/lib/types";

/** 站點時刻軸，橫向捲動顯示每一站，供登記座位與路線時刻頁共用 */
export function StationTimeline({ stations, dense = false }: { stations: StationDto[]; dense?: boolean }) {
    return (
        <div className="-mx-1 overflow-x-auto px-1">
            <div className="flex w-max">
                {stations.map((station, index) => {
                    const last = index === stations.length - 1;
                    const edge = index === 0 || last;
                    return (
                        <div
                            key={station.name}
                            className={`flex shrink-0 flex-col items-center gap-1.5 ${dense ? "w-16 px-1" : "w-21 px-1.5"}`}
                        >
                            <span className="relative flex h-3 w-full items-center justify-center">
                                <span
                                    className={`absolute h-px bg-line ${
                                        index === 0 ? "left-1/2 right-0" : last ? "left-0 right-1/2" : "inset-x-0"
                                    }`}
                                />
                                <span
                                    className={`relative size-1.5 rounded-full ${
                                        edge ? "bg-accent" : "bg-muted opacity-50"
                                    }`}
                                />
                            </span>
                            <span className={`font-mono text-muted ${dense ? "text-[10.5px]" : "text-[13px]"}`}>
                                {station.time}
                            </span>
                            <span
                                className={`text-center leading-tight ${
                                    edge
                                        ? `font-medium ${dense ? "text-[12px]" : "text-sm"}`
                                        : `text-muted ${dense ? "text-[11px]" : "text-xs"}`
                                }`}
                            >
                                {station.name}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
