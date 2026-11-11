"use client";

import { RefreshIcon } from "@/components/icons";
import { BUS_LAYOUT, type SeatCell } from "@/lib/seat";

function Cell({
    cell,
    taken,
    selected,
    disabled,
    onSelect,
}: {
    cell: SeatCell;
    taken: boolean;
    selected: boolean;
    disabled: boolean;
    onSelect: (seat: number) => void;
}) {
    switch (cell.type) {
        case "seat":
            if (taken) {
                return (
                    <button
                        type="button"
                        disabled
                        aria-label={`座位 ${cell.number}，已有人登記`}
                        className="size-full cursor-not-allowed rounded-xl bg-line text-[15px] text-[#8a8e96]"
                    >
                        {cell.number}
                    </button>
                );
            }
            if (selected) {
                return (
                    <button
                        type="button"
                        disabled={disabled}
                        aria-pressed="true"
                        aria-label={`座位 ${cell.number}，已選擇`}
                        onClick={() => onSelect(cell.number)}
                        className="size-full rounded-full bg-accent text-lg font-semibold text-ink"
                    >
                        {cell.number}
                    </button>
                );
            }
            return (
                <button
                    type="button"
                    disabled={disabled}
                    aria-label={`座位 ${cell.number}`}
                    onClick={() => onSelect(cell.number)}
                    className="size-full rounded-xl border-[1.5px] border-faint bg-surface text-base font-medium text-fg transition enabled:hover:border-fg enabled:hover:bg-surface2 disabled:opacity-60"
                >
                    {cell.number}
                </button>
            );
        case "driver":
            return (
                <div className="grid size-full place-items-center rounded-xl bg-surface2 text-xs text-muted">
                    司機
                </div>
            );
        case "door":
            return (
                <div className="grid size-full place-items-center rounded-xl border-[1.5px] border-dashed border-line-strong text-xs text-muted">
                    前門
                </div>
            );
        case "exit":
            return (
                <div className="grid size-full place-items-center rounded-xl bg-[repeating-linear-gradient(-45deg,var(--line-soft)_0_6px,var(--surface)_6px_12px)] text-[11px] text-muted">
                    安全門
                </div>
            );
        case "aisle":
        case "empty":
            return <div aria-hidden="true" />;
    }
}

/** 遊覽車座位圖（42 座）：手機直向、桌機橫向（車頭在左） */
export function SeatMap({
    takenSeats,
    selected = null,
    disabled = false,
    onSelect,
    onRefresh,
}: {
    takenSeats: number[];
    selected?: number | null;
    disabled?: boolean;
    onSelect: (seat: number) => void;
    onRefresh: () => void;
}) {
    const taken = new Set(takenSeats);

    const renderCell = (cell: SeatCell, key: string) => (
        <Cell
            key={key}
            cell={cell}
            taken={cell.type === "seat" && taken.has(cell.number)}
            selected={cell.type === "seat" && cell.number === selected}
            disabled={disabled}
            onSelect={onSelect}
        />
    );

    return (
        <section
            aria-label="座位圖"
            className="flex flex-col gap-5 rounded-3xl border border-line p-4 md:p-6"
        >
            <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Legend */}
                <ul aria-label="圖例" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-fg2">
                    <li className="flex items-center gap-2">
                        <span aria-hidden="true" className="size-4.5 rounded-[5px] border-[1.5px] border-faint" />
                        空位
                    </li>
                    <li className="flex items-center gap-2">
                        <span aria-hidden="true" className="size-4.5 rounded-[5px] bg-line" />
                        已有人登記
                    </li>
                    <li className="flex items-center gap-2">
                        <span aria-hidden="true" className="size-4.5 rounded-full bg-accent" />
                        你選的位子
                    </li>
                </ul>

                {/* Refresh button */}
                <button
                    type="button"
                    onClick={onRefresh}
                    aria-label="重新整理座位狀態"
                    className="flex min-h-11 items-center gap-2 rounded-full bg-surface2 px-3.5 text-sm transition hover:bg-line"
                >
                    <RefreshIcon className="size-4" />
                    更新座位
                </button>
            </div>

            {/* Mobile：直向，車頭在上 */}
            <div className="mx-auto flex w-fit flex-col rounded-t-[56px] rounded-b-[22px] border-2 border-line px-4 pb-4 md:hidden">
                <span aria-hidden="true" className="flex h-11 items-center justify-center text-[13px] tracking-[0.3em] text-muted">
                    車頭
                </span>
                <div className="grid auto-rows-[44px] grid-cols-[44px_44px_18px_44px_44px] gap-1.5">
                    {BUS_LAYOUT.flatMap((row, rowIndex) =>
                        row.map((cell, colIndex) => renderCell(cell, `m-${rowIndex}-${colIndex}`)),
                    )}
                </div>
            </div>

            {/* Desktop：橫向，車頭在左 */}
            <div className="hidden overflow-x-auto pb-1 md:block">
                <div className="mx-auto flex w-max items-stretch rounded-l-[64px] rounded-r-[22px] border-2 border-line py-5 pr-6">
                    <div
                        aria-hidden="true"
                        className="mr-3 flex w-14 items-center justify-center text-[13px] tracking-[0.3em] text-muted [writing-mode:vertical-rl]"
                    >
                        車頭
                    </div>
                    <div className="grid auto-cols-[52px] grid-flow-col grid-rows-[52px_52px_24px_52px_52px] gap-2">
                        {BUS_LAYOUT.flatMap((row, rowIndex) =>
                            row
                                .slice()
                                .reverse()
                                .map((cell, colIndex) => renderCell(cell, `d-${rowIndex}-${colIndex}`)),
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
