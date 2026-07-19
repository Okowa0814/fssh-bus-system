"use client";

import Link from "next/link";

/** 404 畫面：找不到頁面與「權限不符」共用（權限不符直接顯示 404，不洩漏頁面存在） */
export function NotFoundCard() {
    return (
        <div className="grid min-h-dvh place-items-center px-5">
            <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-10 text-center">
                <p className="text-5xl font-bold text-accent">404</p>
                <h1 className="mt-3 text-lg font-semibold">找不到頁面</h1>
                <p className="mt-1.5 text-sm text-muted">您要找的頁面不存在或已被移除。</p>
                <Link
                    href="/"
                    className="mt-6 inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                >
                    回到首頁
                </Link>
            </div>
        </div>
    );
}
