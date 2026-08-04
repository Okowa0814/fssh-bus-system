"use client";

import Link from "next/link";
import { useState } from "react";

const guide = [
    { n: "01", t: "登入系統", d: "使用學校發放的 Google 帳號（@fssh.khc.edu.tw）一鍵登入，無需另外註冊。" },
    { n: "02", t: "選擇路線", d: "於「登記」頁選擇要搭乘的放學路線，可先於「路線」頁查看各路線停靠站與時間。" },
    { n: "03", t: "挑選座位", d: "在座位圖上點選想坐的位置；灰色為已被登記的座位，先登記先得。" },
    { n: "04", t: "確認結果", d: "送出後立即顯示成功或失敗。成功後回到首頁就能看到你的電子票。" },
    { n: "05", t: "取消或改選", d: "開放時間內可於首頁取消登記，取消後即可重新選位。" },
];

const faqs = [
    { q: "可以幫同學一起登記嗎？", a: "不行，一個帳號只能登記一個位子。請他自己用學校帳號登入登記。" },
    { q: "登記完可以換位子嗎？", a: "可以，先在首頁取消原本的登記，再重新選一次位子就好，開放時間內都可以。" },
    { q: "忘記密碼或無法登入怎麼辦？", a: "本系統使用學校 Google 帳號登入，若無法登入請洽學校資訊組確認帳號狀態。" },
];

export default function HelpPage() {
    const [open, setOpen] = useState(-1);

    return (
        <div className="flex max-w-2xl flex-col gap-7">
            {/* Header */}
            <h1 className="mt-2 text-[clamp(32px,4vw,48px)] leading-tight font-bold tracking-tight">
                第一次登記？
                <br />
                星期一分鐘就搞定。
            </h1>

            {/* Guide */}
            <div className="flex flex-col">
                {guide.map((step) => (
                    <div key={step.n} className="flex gap-4.5 border-t border-line py-5">
                        <span className="w-6 shrink-0 pt-0.5 font-mono text-lg text-accent">{step.n}</span>
                        <div>
                            <p className="text-xl font-bold tracking-tight">{step.t}</p>
                            <p className="mt-1.5  leading-relaxed text-muted">{step.d}</p>
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Routes Link */}
            <Link
                href="/routes"
                className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface p-6 transition hover:shadow-card"
            >
                <div>
                    <p className="text-base font-bold">路線與停靠站</p>
                    <p className="mt-0.5 text-sm text-muted">查看各路線停靠站與發車時間</p>
                </div>
                <span className="text-muted">→</span>
            </Link>
            
            {/* FAQ */}
            <div>
                <p className="mb-1.5 font-mono text-lg tracking-wide text-muted uppercase">常見問題</p>
                {faqs.map((faq, i) => (
                    <div key={faq.q} className="border-b border-line">
                        <button
                            type="button"
                            onClick={() => setOpen(open === i ? -1 : i)}
                            className="flex w-full items-center justify-between gap-4 py-4 text-left font-medium"
                        >
                            {faq.q}
                            <span
                                className={`shrink-0 text-muted transition-transform ${open === i ? "rotate-45" : ""}`}
                            >
                                +
                            </span>
                        </button>
                        <div
                            className={`overflow-hidden text-[13.5px] leading-relaxed text-muted transition-all ${
                                open === i ? "max-h-40 pb-4" : "max-h-0"
                            }`}
                        >
                            {faq.a}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
