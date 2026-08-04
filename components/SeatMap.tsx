"use client";

import { RefreshIcon } from "@/components/icons";
import { BUS_LAYOUT, type SeatCell } from "@/lib/seat";

function cellClass(taken: boolean): string {
    if (taken) return "cursor-not-allowed bg-accent text-ink shadow-md";

    return "border border-line text-fg hover:border-accent hover:bg-accent-wash";
}

function Cell({
    cell,
    taken,
    disabled,
    onSelect,
}: {
    cell: SeatCell;
    taken: boolean;
    disabled: boolean;
    onSelect: (seat: number) => void;
}) {
    switch (cell.type) {
        case "seat":
            return (
                <button
                    type="button"
                    disabled={taken || disabled}
                    onClick={() => onSelect(cell.number)}
                    className={`grid h-12 place-items-center rounded-xl font-mono text font-medium transition md:rotate-90 ${cellClass(taken)}`}
                    aria-label={`座位 ${cell.number}${taken ? "（已被登記）" : ""}`}
                >
                    {cell.number}
                </button>
            );
        case "driver":
            return (
                <div className="grid h-12 place-items-center rounded-xl bg-warning-wash text-xs font-medium text-warning-ink md:rotate-90">
                    車長
                </div>
            );
        case "door":
            return (
                <div className="grid h-12 place-items-center rounded-xl bg-warning-wash text-xs font-medium text-warning-ink md:rotate-90">
                    前門
                </div>
            );
        case "exit":
            return (
                <div className="grid h-12 place-items-center rounded-xl border bg-warning-wash border-dashed border-line text-[10px] text-muted md:rotate-90">
                    安全門
                </div>
            );
        case "aisle":
        case "empty":
            return <div className="h-12" />;
    }
}

/** 遊覽車座位圖（依 ai/image.png 的 42 座佈局） */
export function SeatMap({
    takenSeats,
    disabled = false,
    onSelect,
    onRefresh,
}: {
    takenSeats: number[];
    disabled?: boolean;
    onSelect: (seat: number) => void;
    onRefresh: () => void;
}) {
    const taken = new Set(takenSeats);

    return (
        <div className="relative flex flex-col items-center gap-3.5 rounded-card bg-surface p-5 shadow-card">
            {/* Refresh button */}
            <button
                type="button"
                onClick={onRefresh}
                aria-label="重新整理座位狀態"
                className="absolute top-3 right-3 grid size-8 place-items-center rounded-full text-muted transition hover:bg-surface2 hover:text-fg"
            >
                <RefreshIcon className="size-4.5" />
            </button>
            
            {/* Legend */ }
            <div className="flex flex-wrap items-center justify-center gap-3.5 pt-1 text-muted">
                
                <span className="flex items-center gap-1.5">
                    <span className="size-3 rounded border border-line" />
                    可選
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="size-3 rounded bg-accent" />
                    已被登記
                </span>
            </div>

            <div className="relative h-[740px] w-[230px] md:h-[230px] md:w-[740px]">
                <div className="absolute top-1/2 left-1/2 flex h-[740px] w-[230px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 md:-rotate-90">
                    <p className="flex h-8 w-full items-center justify-center border-b border-dashed border-line font-mono text-muted">
                        車頭
                    </p>

                    <div className="grid w-full grid-cols-[1fr_1fr_0.6fr_1fr_1fr] gap-1.5">
                        {BUS_LAYOUT.flatMap((row, rowIndex) =>
                            row.map((cell, colIndex) => (
                                <Cell
                                    key={`${rowIndex}-${colIndex}`}
                                    cell={cell}
                                    taken={cell.type === "seat" && taken.has(cell.number)}
                                    disabled={disabled}
                                    onSelect={onSelect}
                                />
                            )),
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
