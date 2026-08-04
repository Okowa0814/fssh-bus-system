"use client";

import Link from "next/link";

export function NotFoundCard() {
    return (
        <div className="grid min-h-dvh place-items-center bg-bg px-5">
            <div className="w-full max-w-sm rounded-card bg-surface p-10 text-center shadow-card">
                <p className="font-mono text-5xl font-bold text-accent">404</p>
                <h1 className="mt-3 text-lg font-bold">找不到頁面</h1>
                <p className="mt-1.5 text-sm text-muted">您要找的頁面不存在或已被移除。</p>
                <Link
                    href="/"
                    className="mt-6 inline-block rounded-field bg-fg px-5 py-2.5 text-sm font-medium text-bg transition hover:opacity-90"
                >
                    回到首頁
                </Link>
            </div>
        </div>
    );
}
