"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface ScrollPanelProps {
    onClose: () => void;
    /** 面板寬度等外層樣式，例如 "max-w-xl" */
    className?: string;
    /** 內層捲動區的內距，例如 "p-5 md:p-9" */
    paddingClassName?: string;
    /** 箭頭按鈕的無障礙說明 */
    hintLabel?: string;
    children: ReactNode;
}

// 彈窗面板：圓角外框 + 內部捲動（隱藏捲軸）。
// 內容超出可視範圍且尚未捲到底時，底部會出現向下箭頭，提示下方還有內容，點擊可往下捲。
export function ScrollPanel({
    onClose,
    className = "max-w-lg",
    paddingClassName = "p-7 md:p-9",
    hintLabel = "向下捲動，還有更多內容",
    children,
}: ScrollPanelProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [canScrollDown, setCanScrollDown] = useState(false);

    useEffect(() => {
        const scroller = scrollRef.current;
        const content = contentRef.current;

        if (!scroller || !content) return;

        const update = () => {
            setCanScrollDown(scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight > 8);
        };

        update();
        scroller.addEventListener("scroll", update, { passive: true });
        // 內容高度會變（例如路線資料載入完成）、視窗大小也會變，都要重新判斷
        const observer = new ResizeObserver(update);
        observer.observe(scroller);
        observer.observe(content);

        return () => {
            scroller.removeEventListener("scroll", update);
            observer.disconnect();
        };
    }, []);

    const scrollDown = () => {
        scrollRef.current?.scrollBy({ top: scrollRef.current.clientHeight * 0.7, behavior: "smooth" });
    };

    return (
        <div className={`relative w-full overflow-hidden rounded-[28px] bg-surface shadow-card-lg ${className}`}>
            <div ref={scrollRef} className={`no-scrollbar relative max-h-[85dvh] overflow-y-auto ${paddingClassName}`}>
                <button
                    type="button"
                    aria-label="關閉"
                    onClick={onClose}
                    className="absolute top-6 right-6 text-xl text-muted transition hover:text-fg"
                >
                    ✕
                </button>

                <div ref={contentRef}>{children}</div>
            </div>

            {canScrollDown && (
                <button
                    type="button"
                    aria-label={hintLabel}
                    onClick={scrollDown}
                    className="absolute inset-x-0 bottom-0 flex h-20 items-end justify-center bg-gradient-to-t from-surface via-surface/90 to-transparent pb-3 text-fg"
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className="size-8 animate-bounce motion-reduce:animate-none"
                    >
                        <path d="M6 9l6 6 6-6" />
                    </svg>
                </button>
            )}
        </div>
    );
}
