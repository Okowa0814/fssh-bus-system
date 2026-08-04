"use client";

import { useState } from "react";

import { HelpGuide } from "@/components/views/HelpGuide";
import { HelpIcon } from "@/components/icons";

// 點擊觸發按鈕即可彈出的「使用說明」彈窗，供登入頁等版面較窄的頁面使用
export function HelpGuideModal() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex gap-1.5 text-muted transition hover:text-fg"
            >
                <HelpIcon className="size-6" />
                使用說明
            </button>

            {open && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-fg/40 p-5">
                    {/* Overlay */}
                    <button
                        type="button"
                        aria-label="關閉"
                        onClick={() => setOpen(false)}
                        className="absolute inset-0 cursor-default"
                    />

                    {/* Panel */}
                    <div className="relative max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-card bg-surface p-7 shadow-card md:p-9">
                        <button
                            type="button"
                            aria-label="關閉"
                            onClick={() => setOpen(false)}
                            className="absolute top-6 right-6 text-xl text-muted transition hover:text-fg"
                        >
                            ✕
                        </button>

                        <HelpGuide />
                    </div>
                </div>
            )}
        </>
    );
}
