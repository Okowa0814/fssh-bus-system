"use client";

// Stepper component for displaying a multi-step process
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
    return (
        <ol className="flex items-center gap-2.5">
            {steps.map((label, index) => {
                const done = index < current;
                const active = index === current;
                return (
                    <li key={label} className="flex min-w-0 flex-1 items-center gap-2.5 last:flex-none">
                        <span
                            className={`grid size-6 shrink-0 place-items-center rounded-full font-mono text-[11px] font-medium transition ${
                                done
                                    ? "bg-accent text-ink"
                                    : active
                                      ? "bg-fg text-bg"
                                      : "border border-line text-muted"
                            }`}
                        >
                            {done ? "✓" : index + 1}
                        </span>
                        <span
                            className={`whitespace-nowrap text-[12.5px] ${
                                active ? "font-medium text-fg" : "text-muted"
                            }`}
                        >
                            {label}
                        </span>
                        {index < steps.length - 1 && (
                            <span
                                className={`h-px min-w-2 flex-1 ${done ? "bg-accent" : "bg-line"}`}
                            />
                        )}
                    </li>
                );
            })}
        </ol>
    );
}
