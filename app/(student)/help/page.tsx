"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import type { RouteDto } from "@/lib/types";
import { BusIcon } from "@/components/icons";

const guide = [
    { title: "登入系統", desc: "使用學校發放的 Google 帳號（@fssh.khc.edu.tw）一鍵登入，無需另外註冊。" },
    { title: "選擇路線", desc: "於「校車登記」頁選擇要搭乘的放學路線，可先在下方查看各路線停靠站與時間。" },
    { title: "挑選座位", desc: "在座位圖上點選想坐的位置；灰色為已被登記的座位，先登記先得。" },
    { title: "確認結果", desc: "送出後立即顯示成功或失敗。成功後可於「我的身份」頁查看座位。" },
    { title: "取消或改選", desc: "登記時間內可於「我的身份」頁取消登記，取消後即可重新選位。" },
];

export default function HelpPage() {
    const [routes, setRoutes] = useState<RouteDto[]>([]);

    useEffect(() => {
        api<RouteDto[]>("/api/student/routes").then(setRoutes).catch(() => {});
    }, []);

    return (
        <>
            <h1 className="text-2xl font-bold tracking-tight">使用說明</h1>
            <p className="mt-1.5 text-sm text-muted">操作流程與各路線停靠站資訊。</p>

            <section className="mt-7 rounded-3xl border border-line bg-surface p-7">
                <h2 className="text-base font-bold">操作說明</h2>
                <ol className="mt-5 space-y-5">
                    {guide.map((step, index) => (
                        <li key={step.title} className="flex gap-4">
                            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-wash text-sm font-bold text-accent-ink">
                                {index + 1}
                            </span>
                            <div>
                                <h3 className="text-sm font-semibold">{step.title}</h3>
                                <p className="mt-0.5 text-sm leading-relaxed text-muted">
                                    {step.desc}
                                </p>
                            </div>
                        </li>
                    ))}
                </ol>
            </section>

            <section className="mt-7">
                <h2 className="text-base font-bold">路線與停靠站</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {routes.length === 0 && (
                        <p className="col-span-full rounded-3xl border border-line bg-surface p-7 text-center text-sm text-muted">
                            路線資訊載入中…
                        </p>
                    )}
                    {routes.map((route) => (
                        <div key={route.id} className="rounded-3xl border border-line bg-surface p-6">
                            <div className="flex items-center gap-3">
                                <span className="grid size-10 place-items-center rounded-xl bg-accent-wash text-accent-ink">
                                    <BusIcon className="size-5" />
                                </span>
                                <h3 className="text-base font-bold">{route.name}</h3>
                            </div>
                            <ul className="mt-5 space-y-0">
                                {route.stations.map((station, index) => (
                                    <li key={station.name} className="relative flex gap-4 pb-5 last:pb-0">
                                        {index < route.stations.length - 1 && (
                                            <span className="absolute left-[5px] top-4 h-full w-0.5 bg-line" />
                                        )}
                                        <span className="relative mt-1.5 size-3 shrink-0 rounded-full border-2 border-accent bg-surface" />
                                        <div className="flex flex-1 items-center justify-between gap-3">
                                            <span className="text-sm font-medium">{station.name}</span>
                                            <span className="rounded-full bg-bg px-2.5 py-1 text-xs font-semibold text-muted">
                                                {station.time}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </section>
        </>
    );
}
