"use client";

import { CheckIcon } from "@/components/icons";

export interface StepItem {
    label: string;
    sub: string;
}

// Stepper component for displaying a multi-step process
// current 等於 steps.length 時代表全部完成
export function Stepper({
    steps,
    current,
    goto,
}: {
    steps: StepItem[];
    current: number;
    goto?: (index: number) => void;
}) {
    const allDone = current >= steps.length;
    const stepNo = Math.min(current + 1, steps.length);
    const canGoto = (index: number) => !!goto && !allDone && index < current;

    return (
        <>
            {/* Mobile：進度條 */}
            <div className="flex w-full flex-col gap-2.5 md:hidden">
                <span className="text-sm text-muted">
                    第 {stepNo} 步，共 {steps.length} 步
                </span>
                <ol aria-label="登記步驟" className="grid w-full grid-cols-4 gap-1.5">
                    {steps.map((step, index) => {
                        const done = index < current;
                        const active = index === current;

                        return (
                            <li key={step.label} className="flex min-w-0 flex-col gap-2">
                                <button
                                    type="button"
                                    disabled={!canGoto(index)}
                                    onClick={() => goto?.(index)}
                                    aria-label={`第 ${index + 1} 步：${step.label}${done ? "（已完成）" : ""}`}
                                    aria-current={active ? "step" : undefined}
                                    className="flex flex-col gap-2 text-left"
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`block h-1.5 w-full rounded-full ${
                                            done ? "bg-fg" : active ? "bg-accent" : "bg-line"
                                        }`}
                                    />
                                    <span
                                        className={`truncate text-[13px] ${
                                            active
                                                ? "font-bold text-fg"
                                                : done
                                                  ? "font-medium text-fg"
                                                  : "text-muted"
                                        }`}
                                    >
                                        {step.label}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ol>
            </div>

            {/* Desktop：圓形步驟 */}
            <ol
                aria-label="登記步驟"
                className="hidden flex-wrap items-center justify-center gap-4 py-2 md:flex"
            >
                {steps.map((step, index) => {
                    const done = index < current;
                    const active = index === current;

                    return (
                        <li key={step.label} className="flex items-center gap-3">
                            <button
                                type="button"
                                disabled={!canGoto(index)}
                                onClick={() => goto?.(index)}
                                aria-current={active ? "step" : undefined}
                                className="flex items-center gap-2.5 text-left enabled:cursor-pointer"
                            >
                                <span
                                    aria-hidden="true"
                                    className={`grid size-11 shrink-0 place-items-center rounded-full text-lg ${
                                        done
                                            ? "bg-fg text-ink"
                                            : active
                                              ? "bg-accent font-semibold text-ink"
                                              : "border-[1.5px] border-line-strong font-medium text-muted"
                                    }`}
                                >
                                    {done ? <CheckIcon className="size-5" /> : index + 1}
                                </span>
                                <span className="flex flex-col gap-px">
                                    <span
                                        className={`text-lg ${active ? "font-bold" : "font-medium"} ${
                                            done || active ? "text-fg" : "text-muted"
                                        }`}
                                    >
                                        {step.label}
                                    </span>
                                    <span className="max-w-32 truncate text-sm text-muted">{step.sub}</span>
                                </span>
                            </button>

                            {index < steps.length - 1 && (
                                <span
                                    aria-hidden="true"
                                    className={`h-0.5 w-10 lg:w-20 ${done ? "bg-fg" : "bg-line"}`}
                                />
                            )}
                        </li>
                    );
                })}
            </ol>
        </>
    );
}
