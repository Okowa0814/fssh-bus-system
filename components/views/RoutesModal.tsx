"use client";

import { useState } from "react";

import { RoutesView } from "@/components/views/RoutesView";

// 點擊觸發按鈕即可彈出的「路線」彈窗，供登入頁等版面較窄的頁面使用
export function RoutesModal() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex min-h-11 items-center rounded-full px-4 text-[15px] font-medium transition hover:bg-surface2"
            >
                / 查看路線
            </button>

            {open && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-fg/30 p-3 md:p-5">
                    {/* Overlay */}
                    <button
                        type="button"
                        aria-label="關閉"
                        onClick={() => setOpen(false)}
                        className="absolute inset-0 cursor-default"
                    />

                    {/* Panel */}
                    <div className="relative max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded-[28px] bg-surface p-5 shadow-card-lg md:p-9">
                        <button
                            type="button"
                            aria-label="關閉"
                            onClick={() => setOpen(false)}
                            className="absolute top-6 right-6 text-xl text-muted transition hover:text-fg"
                        >
                            ✕
                        </button>

                        <RoutesView />
                    </div>
                </div>
            )}
        </>
    );
}
