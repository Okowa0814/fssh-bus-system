"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/useAuth";
import { api, ApiError } from "@/services/api";
import type { MeResponse } from "@/lib/types";

export default function ProfilePage() {
    const { user } = useCurrentUser();
    const [me, setMe] = useState<MeResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const load = useCallback(() => {
        setLoading(true);
        api<MeResponse>("/api/student/me")
            .then(setMe)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const cancel = async () => {
        if (!me?.booking) {
            return;
        }
        setCancelling(true);
        setMessage(null);
        try {
            await api(`/api/student/bookings/${me.booking.id}`, { method: "DELETE" });
            setCancelOpen(false);
            load();
        } catch (error) {
            setMessage(error instanceof ApiError ? error.message : "取消失敗，請稍後再試");
        } finally {
            setCancelling(false);
        }
    };

    const info = me?.user;
    const booking = me?.booking ?? null;

    const rows = [
        { k: "姓名", v: info?.name ?? user.name, mono: false },
        { k: "學號", v: info?.studentId ?? user.sub, mono: true },
        { k: "入學學年", v: (info?.enrollmentYear ?? user.enrollmentYear) || "—", mono: false },
        { k: "學校信箱", v: info?.email ?? user.email, mono: true },
    ];

    return (
        <div className="flex flex-col gap-5.5">
            <div>
                <p className="font-mono text-[11px] tracking-wide text-muted uppercase">我的票夾</p>
                <h1 className="mt-2 text-[clamp(22px,3.4vw,30px)] font-bold tracking-tight">
                    {loading ? "載入中…" : booking ? "今天的車票" : "還沒有票"}
                </h1>
            </div>

            {!loading && booking && (
                <div className="w-full max-w-md overflow-hidden rounded-card bg-surface shadow-card-lg">
                    <div className="h-1 bg-accent" />
                    <div className="flex flex-col gap-4.5 px-6 pt-5.5 pb-4.5">
                        <div className="flex items-center gap-2 font-mono text-[11px] tracking-wide text-success uppercase">
                            <span className="size-1.5 rounded-full bg-success" />
                            今日有效
                        </div>
                        <div>
                            <p className="text-2xl font-bold tracking-tight">{booking.route.name}</p>
                            <p className="mt-1 text-[13px] text-muted">
                                登記時間：
                                {new Date(booking.createdAt).toLocaleString("zh-TW", { hour12: false })}
                            </p>
                        </div>
                        <div className="flex items-end gap-8">
                            {booking.route.departAt && (
                                <div>
                                    <p className="text-[11px] text-muted">發車</p>
                                    <p className="mt-0.5 font-mono text-[28px] font-medium">
                                        {booking.route.departAt}
                                    </p>
                                </div>
                            )}
                            <div>
                                <p className="text-[11px] text-muted">座位</p>
                                <p className="mt-0.5 font-mono text-[28px] font-medium text-accent">
                                    {booking.seatNumber}
                                </p>
                            </div>
                            <div className="ml-auto size-13 rounded-lg bg-[repeating-conic-gradient(var(--fg)_0%_25%,var(--surface)_0%_50%)] bg-[length:9px_9px]" />
                        </div>
                    </div>
                    <div className="relative h-6">
                        <div className="absolute top-0 -left-3 size-6 rounded-full bg-bg" />
                        <div className="absolute top-0 -right-3 size-6 rounded-full bg-bg" />
                        <div className="absolute top-3 right-4.5 left-4.5 h-px bg-[repeating-linear-gradient(90deg,var(--line)_0_5px,transparent_5px_11px)]" />
                    </div>
                    <div className="flex items-center justify-between gap-3 px-6 pt-1 pb-4.5">
                        <span className="text-xs text-muted">開放時間內可以取消</span>
                        <button
                            type="button"
                            onClick={() => setCancelOpen(true)}
                            className="rounded-field border border-line px-3.5 py-2 text-[12.5px] text-muted transition hover:border-danger hover:text-danger-ink"
                        >
                            取消登記
                        </button>
                    </div>
                </div>
            )}

            {!loading && !booking && (
                <div className="flex max-w-md flex-col items-start gap-3 rounded-card border border-dashed border-line p-8.5">
                    <p className="text-[15px] font-medium">票夾是空的</p>
                    <p className="text-[13.5px] leading-relaxed text-muted">
                        今天還沒有登記。登記完成後，電子票會出現在這裡。
                    </p>
                    <Link
                        href="/booking"
                        className="rounded-field bg-fg px-5 py-2.5 text-sm font-medium text-bg"
                    >
                        去登記
                    </Link>
                </div>
            )}

            {message && (
                <p className="max-w-md rounded-field bg-danger-wash px-4 py-3 text-center text-sm text-danger-ink">
                    {message}
                </p>
            )}

            <div className="flex max-w-md flex-col gap-0.5">
                <p className="mb-3 font-mono text-[11px] tracking-wide text-muted uppercase">我的資料</p>
                {rows.map((row) => (
                    <div
                        key={row.k}
                        className="flex items-baseline justify-between gap-5 border-b border-line py-3"
                    >
                        <span className="text-[13px] text-muted">{row.k}</span>
                        <span
                            className={`text-right break-all ${row.mono ? "font-mono text-[13px] text-muted" : "text-[13.5px] font-medium"}`}
                        >
                            {row.v}
                        </span>
                    </div>
                ))}
                <p className="mt-4 text-xs leading-relaxed text-muted">
                    資料由校務系統同步，如有錯誤請洽學務處生活輔導組。
                </p>
            </div>

            {cancelOpen && (
                <div
                    onClick={() => !cancelling && setCancelOpen(false)}
                    className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[3px]"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex w-full max-w-md flex-col gap-4 rounded-t-card bg-surface px-6 pt-5.5 pb-7.5 shadow-card-lg"
                    >
                        <div className="mx-auto h-1 w-9 rounded-full bg-line" />
                        <div>
                            <p className="text-[19px] font-bold tracking-tight">要放掉這個位子嗎？</p>
                            <p className="mt-2 text-sm leading-relaxed text-muted">
                                取消後座位會馬上開放給其他同學，開放時間內你還是可以重新登記。
                            </p>
                        </div>
                        <div className="flex flex-col gap-2.5">
                            <button
                                type="button"
                                disabled={cancelling}
                                onClick={cancel}
                                className="rounded-field border border-line py-3.5 text-[15px] font-medium text-danger-ink transition hover:border-danger hover:bg-danger-wash disabled:opacity-50"
                            >
                                {cancelling ? "取消中…" : "確定取消登記"}
                            </button>
                            <button
                                type="button"
                                disabled={cancelling}
                                onClick={() => setCancelOpen(false)}
                                className="rounded-field bg-fg py-3.5 text-[15px] font-medium text-bg disabled:opacity-50"
                            >
                                先留著
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
