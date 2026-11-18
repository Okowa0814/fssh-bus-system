"use client";

import { useState } from "react";

import { RoutesView } from "@/components/views/RoutesView";
import { ScrollPanel } from "@/components/views/ScrollPanel";

// 點擊觸發按鈕即可彈出的「路線」彈窗，供登入頁等版面較窄的頁面使用
// variant: "nav" 為 header 文字導覽；"pill" 為手機版登入頁的並排膠囊按鈕
export function RoutesModal({ variant = "nav" }: { variant?: "nav" | "pill" }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={
                    variant === "pill"
                        ? "flex min-h-12 items-center justify-center rounded-full border-[1.5px] border-line text-[15px] font-medium transition hover:border-fg"
                        : "flex min-h-11 items-center rounded-full px-4 text-[15px] font-medium transition hover:bg-surface2"
                }
            >
                {variant === "nav" && "/ "}查看路線
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
                    <ScrollPanel
                        onClose={() => setOpen(false)}
                        className="max-w-xl"
                        paddingClassName="p-5 md:p-9"
                        hintLabel="向下捲動，還有更多站點"
                    >
                        <RoutesView />
                    </ScrollPanel>
                </div>
            )}
        </>
    );
}
