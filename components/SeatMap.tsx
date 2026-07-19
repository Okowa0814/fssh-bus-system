"use client";

import { BUS_LAYOUT, type SeatCell } from "@/lib/seat";

function cellClass(taken: boolean, selected: boolean): string {
    if (selected) {
        return "bg-accent text-white shadow-md ring-2 ring-accent ring-offset-2 ring-offset-surface";
    }
    if (taken) {
        return "cursor-not-allowed border border-line bg-bg text-muted/50 line-through";
    }
    return "border border-line bg-surface text-fg hover:border-accent hover:bg-accent-wash hover:text-accent-ink";
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
                    className={`grid h-10 place-items-center rounded-xl text-sm font-semibold transition ${cellClass(taken, selected)}`}
                    aria-label={`座位 ${cell.number}${taken ? "（已被登記）" : ""}`}
                >
                    {cell.number}
                </button>
            );
        case "driver":
            return (
                <div className="grid h-10 place-items-center rounded-xl bg-warning-wash text-xs font-medium text-warning-ink">
                    車長
                </div>
            );
        case "door":
            return (
                <div className="grid h-10 place-items-center rounded-xl bg-accent-wash text-xs font-medium text-accent-ink">
                    前門
                </div>
            );
        case "exit":
            return (
                <div className="grid h-10 place-items-center rounded-xl border border-dashed border-line text-[11px] text-muted">
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
        <div className="space-y-4">
            <div className="mx-auto max-w-sm rounded-3xl border border-line bg-bg p-4">
                <p className="mb-3 text-center text-xs font-medium tracking-widest text-muted">
                    ▲ 車頭
                </p>
                <div className="grid grid-cols-[1fr_1fr_0.6fr_1fr_1fr] gap-1.5">
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
                <p className="mt-3 text-center text-xs font-medium tracking-widest text-muted">
                    ▼ 車尾
                </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted">
                <span className="flex items-center gap-1.5">
                    <span className="size-3.5 rounded border border-line bg-surface" />
                    可選
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="size-3.5 rounded bg-accent" />
                    已選
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="size-3.5 rounded border border-line bg-bg" />
                    已被登記
                </span>
            </div>
        </div>
    );
}
