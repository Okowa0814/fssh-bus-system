"use client";

import Link from "next/link";
import { ArrowRightIcon, MapPinIcon } from "@/components/icons";

const guide = [
    { title: "登入系統", desc: "使用學校發放的 Google 帳號（@fssh.khc.edu.tw）一鍵登入，無需另外註冊。" },
    { title: "選擇路線", desc: "於「校車登記」頁選擇要搭乘的放學路線，可先於「路線」頁查看各路線停靠站與時間。" },
    { title: "挑選座位", desc: "在座位圖上點選想坐的位置；灰色為已被登記的座位，先登記先得。" },
    { title: "確認結果", desc: "送出後立即顯示成功或失敗。成功後可於「我的身份」頁查看座位。" },
    { title: "取消或改選", desc: "登記時間內可於「我的身份」頁取消登記，取消後即可重新選位。" },
];

export default function HelpPage() {
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

            <Link
                href="/routes"
                className="group mt-7 flex items-center justify-between gap-3 rounded-3xl border border-line bg-surface p-6 transition hover:border-accent hover:shadow-lg hover:shadow-accent/10"
            >
                <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-2xl bg-accent-wash text-accent-ink">
                        <MapPinIcon className="size-5.5" />
                    </span>
                    <div>
                        <h2 className="text-base font-bold">路線與停靠站</h2>
                        <p className="mt-0.5 text-sm text-muted">查看各路線停靠站與發車時間</p>
                    </div>
                </div>
                <ArrowRightIcon className="size-5 text-muted transition group-hover:translate-x-1 group-hover:text-accent-ink" />
            </Link>
        </>
    );
}
