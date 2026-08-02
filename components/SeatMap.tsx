"use client";

import { BUS_LAYOUT, type SeatCell } from "@/lib/seat";

function cellClass(taken: boolean, selected: boolean): string {
    if (selected) {
        return "scale-105 bg-accent text-ink shadow-md";
    }
    if (taken) {
        return "cursor-not-allowed bg-surface2 text-muted/60";
    }
    return "border border-line text-fg hover:border-accent hover:bg-accent-wash";
}

function Cell({
    cell,
    taken,
    selected,
    onSelect,
}: {
    cell: SeatCell;
    taken: boolean;
    selected: boolean;
    onSelect: (seat: number) => void;
}) {
    switch (cell.type) {
        case "seat":
            return (
                <button
                    type="button"
                    disabled={taken}
                    onClick={() => onSelect(cell.number)}
                    className={`grid h-10 place-items-center rounded-xl font-mono text-sm font-medium transition ${cellClass(taken, selected)}`}
                    aria-label={`座位 ${cell.number}${taken ? "（已被登記）" : ""}`}
                >
                    {cell.number}
                </button>
            );
        case "driver":
            return (
                <div className="grid h-10 place-items-center rounded-xl bg-warning-wash text-[11px] font-medium text-warning-ink">
                    車長
                </div>
            );
        case "door":
            return (
                <div className="grid h-10 place-items-center rounded-xl bg-accent-wash text-[11px] font-medium text-accent-ink">
                    前門
                </div>
            );
        case "exit":
            return (
                <div className="grid h-10 place-items-center rounded-xl border border-dashed border-line text-[10px] text-muted">
                    安全門
                </div>
            );
        case "aisle":
        case "empty":
            return <div className="h-10" />;
    }
}

/** 遊覽車座位圖（依 ai/image.png 的 42 座佈局） */
export function SeatMap({
    takenSeats,
    selected,
    onSelect,
}: {
    takenSeats: number[];
    selected: number | null;
    onSelect: (seat: number) => void;
}) {
    const taken = new Set(takenSeats);

    return (
        <div className="flex flex-col items-center gap-3.5 rounded-card bg-surface p-5 shadow-card">
            <p className="w-full max-w-[230px] border-b border-dashed border-line pb-3 text-center font-mono text-[11px] text-muted">
                ▲ 車頭
            </p>
            <div className="grid w-full max-w-[230px] grid-cols-[1fr_1fr_0.6fr_1fr_1fr] gap-1.5">
                {BUS_LAYOUT.flatMap((row, rowIndex) =>
                    row.map((cell, colIndex) => (
                        <Cell
                            key={`${rowIndex}-${colIndex}`}
                            cell={cell}
                            taken={cell.type === "seat" && taken.has(cell.number)}
                            selected={cell.type === "seat" && selected === cell.number}
                            onSelect={onSelect}
                        />
                    )),
                )}
            </div>
            <p className="w-full max-w-[230px] border-t border-dashed border-line pt-3 text-center font-mono text-[11px] text-muted">
                ▼ 車尾
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3.5 pt-1 text-[11px] text-muted">
                <span className="flex items-center gap-1.5">
                    <span className="size-3 rounded border border-line" />
                    可選
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="size-3 rounded bg-accent" />
                    已選
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="size-3 rounded bg-surface2 opacity-60" />
                    已被登記
                </span>
            </div>
        </div>
    );
}
