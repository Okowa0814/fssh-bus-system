"use client";

import { useEffect, useRef, useState } from "react";
import { MoreIcon } from "./icons";

export interface ActionMenuItem {
    label: string;
    onSelect: () => void;
    disabled?: boolean;
    danger?: boolean;
}

/** 通用「⋮」操作選單：點擊展開、點外部自動關閉 */
export function ActionMenu({ items }: { items: ActionMenuItem[] }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) {
            return;
        }
        const onClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, [open]);

    return (
        <div ref={ref} className="relative inline-block text-left">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-label="更多操作"
                className="flex size-8 items-center justify-center rounded-full text-muted transition hover:bg-surface2"
            >
                <MoreIcon className="size-5" />
            </button>

            {open && (
                <div className="absolute right-0 z-10 mt-1 w-40 overflow-hidden rounded-field border border-line bg-surface shadow-float">
                    {items.map((item) => (
                        <button
                            key={item.label}
                            type="button"
                            disabled={item.disabled}
                            onClick={() => {
                                setOpen(false);
                                item.onSelect();
                            }}
                            className={`block w-full px-3.5 py-2.5 text-left text-sm transition hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-50 ${
                                item.danger ? "text-danger-ink" : ""
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
