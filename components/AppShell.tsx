"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { TokenPayload } from "@/lib/types";
import {
    BusIcon,
    ClipboardIcon,
    HelpIcon,
    HomeIcon,
    LogoutIcon,
    MoonIcon,
    SunIcon,
    UserIcon,
} from "./icons";

const THEME_KEY = "fssh_bus_theme";

const studentLinks = [
    { href: "/", label: "首頁", icon: HomeIcon },
    { href: "/booking", label: "登記", icon: BusIcon },
    { href: "/profile", label: "身份", icon: UserIcon },
    { href: "/help", label: "說明", icon: HelpIcon },
];

const adminLinks = [
    { href: "/admin", label: "登記總覽", icon: ClipboardIcon },
    { href: "/admin/routes", label: "路線管理", icon: BusIcon },
];

function ThemeToggle() {
    const [dark, setDark] = useState(false);

    useEffect(() => {
        setDark(document.documentElement.dataset.theme === "dark");
    }, []);

    const toggle = () => {
        const next = !dark;
        setDark(next);
        document.documentElement.dataset.theme = next ? "dark" : "";
        try {
            window.localStorage.setItem(THEME_KEY, next ? "dark" : "light");
        } catch {
            // localStorage 不可用時僅影響記憶主題，不阻斷操作
        }
    };

    return (
        <button
            type="button"
            onClick={toggle}
            className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-bg hover:text-fg"
            aria-label="切換深淺色主題"
        >
            {dark ? <SunIcon className="size-4.5" /> : <MoonIcon className="size-4.5" />}
        </button>
    );
}

export function AppShell({
    user,
    onLogout,
    children,
}: {
    user: TokenPayload;
    onLogout: () => void;
    children: ReactNode;
}) {
    const pathname = usePathname();
    const links = [...studentLinks, ...(user.isAdmin ? adminLinks : [])];

    return (
        <div className="flex min-h-dvh flex-col">
            <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
                <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-5">
                    <Link href="/" className="flex items-center gap-2.5">
                        <span className="grid size-9 place-items-center rounded-xl bg-accent text-white">
                            <BusIcon className="size-5" />
                        </span>
                        <span className="leading-tight">
                            <span className="block text-xs text-muted">鳳山高中</span>
                            <span className="block text-[15px] font-semibold">專車登記系統</span>
                        </span>
                    </Link>

                    <nav className="hidden items-center gap-1 md:flex">
                        {links.map(({ href, label }) => (
                            <Link
                                key={href}
                                href={href}
                                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                                    pathname === href
                                        ? "bg-accent-wash text-accent-ink"
                                        : "text-muted hover:bg-bg hover:text-fg"
                                }`}
                            >
                                {label}
                            </Link>
                        ))}
                    </nav>

                    <div className="flex items-center gap-1.5">
                        <ThemeToggle />
                        <button
                            type="button"
                            onClick={onLogout}
                            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-danger-wash hover:text-danger-ink"
                        >
                            <LogoutIcon className="size-4" />
                            <span className="hidden sm:inline">登出</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-28 pt-8 md:pb-12">
                {children}
            </main>

            {/* 行動版底部導覽列（參考 ai/2/_4） */}
            <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface/95 backdrop-blur md:hidden">
                <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
                    {links.map(({ href, label, icon: Icon }) => {
                        const active = pathname === href;
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`flex flex-col items-center gap-1 px-3 py-2.5 text-[11px] font-medium ${
                                    active ? "text-accent-ink" : "text-muted"
                                }`}
                            >
                                <span
                                    className={`grid size-9 place-items-center rounded-full transition ${
                                        active ? "bg-accent text-white" : ""
                                    }`}
                                >
                                    <Icon className="size-5" />
                                </span>
                                {label}
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
