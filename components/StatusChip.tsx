"use client";

const styles: Record<string, { className: string; label: string }> = {
    SUCCESS: { className: "bg-success-wash text-success-ink", label: "登記成功" },
    CANCELLED: { className: "bg-danger-wash text-danger-ink", label: "已取消" },
    OPEN: { className: "bg-success-wash text-success-ink", label: "開放登記中" },
    CLOSED: { className: "bg-warning-wash text-warning-ink", label: "非登記時間" },
};

export function StatusChip({ status }: { status: string }) {
    const style = styles[status] ?? { className: "bg-surface2 text-muted", label: status };
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style.className}`}
        >
            <span className="size-1.5 rounded-full bg-current" />
            {style.label}
        </span>
    );
}
