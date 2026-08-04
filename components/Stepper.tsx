"use client";

// Stepper component for displaying a multi-step process
export function Stepper({ steps, current, goto }: { steps: string[]; current: number; goto: (index: number) => void }) {
    return (
        <ol className="flex items-center gap-2.5">
            {steps.map((label, index) => {
                const done = index < current;
                const active = index === current;

                return (
                    <li key={label} 
                        className="flex min-w-0 flex-1 items-center gap-2.5 last:flex-none"
                        onClick={() => { if (index < current) goto(index); }}
                    >
                        <div>
                            {/* Step num */}
                            <span
                                className={`grid size-10 text-lg shrink-0 place-items-center rounded-full font-mono font-medium transition ${
                                    done? "bg-accent text-ink"
                                    : active? "bg-fg text-bg"
                                    : "border border-line text-muted"
                                }`}
                                >
                                {done ? "✓" : index + 1}
                            </span>

                            {/* Step label */}
                            <span
                                className={`whitespace-nowrap text-sm
                                    ${active ? "font-medium text-fg" : "text-muted"}
                                    ${index === current ? "font-bold" : "hidden"}
                                    `}
                                    >
                                {label}
                            </span>
                        </div>

                        {/* Step connector */}
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
