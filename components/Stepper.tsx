"use client";

import { CheckIcon } from "./icons";

/** 漸進式步驟指示器（登記頁三步驟） */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
    return (
        <ol className="flex items-center">
            {steps.map((label, index) => {
                const done = index < current;
                const active = index === current;
                return (
                    <li key={label} className="flex flex-1 items-center last:flex-none">
                        <div className="flex flex-col items-center gap-1.5">
                            <span
                                className={`grid size-9 place-items-center rounded-full text-sm font-semibold transition ${
                                    done
                                        ? "bg-success text-white"
                                        : active
                                          ? "bg-accent text-white"
                                          : "border border-line bg-surface text-muted"
                                }`}
                            >
                                {done ? <CheckIcon className="size-4" /> : index + 1}
                            </span>
                            <span
                                className={`whitespace-nowrap text-xs font-medium ${
                                    active ? "text-fg" : "text-muted"
                                }`}
                            >
                                {label}
                            </span>
                        </div>
                        {index < steps.length - 1 && (
                            <span
                                className={`mx-2 mb-5 h-0.5 flex-1 rounded-full ${
                                    done ? "bg-success" : "bg-line"
                                }`}
                            />
                        )}
                    </li>
                );
            })}
        </ol>
    );
}
