"use client";

import Link from "next/link";

import { HelpGuide } from "@/components/views/HelpGuide";

export default function HelpPage() {
    return (
        <div className="flex max-w-2xl flex-col gap-7">
            <HelpGuide />

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
        </div>
    );
}
