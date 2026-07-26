"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useCurrentUser } from "@/hooks/useAuth";

import { BusIcon, ClipboardIcon, HelpIcon, HomeIcon, LogoutIcon, MapPinIcon, UserIcon } from "./icons";
import { ThemeToggle } from "./ThemeToggle";

const studentLinks = [
    { href: "/", label: "首頁", icon: HomeIcon },
    { href: "/booking", label: "登記", icon: BusIcon },
    { href: "/profile", label: "身份", icon: UserIcon },
    { href: "/routes", label: "路線", icon: MapPinIcon },
    { href: "/help", label: "說明", icon: HelpIcon },
];

const adminLinks = [
    { href: "/admin", label: "登記總覽", icon: ClipboardIcon },
    { href: "/admin/routes", label: "路線管理", icon: BusIcon },
];

export function AppShell({ children }: {children: ReactNode;}) {
    const { user, logout } = useCurrentUser();
    const pathname = usePathname();
    const links = user.isAdmin ? adminLinks : studentLinks;

    return (
        <div className="flex min-h-dvh flex-col">
            <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
                <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between pl-5 pr-2">

                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2.5">
                        <Image src="/fssh-badge.png" alt="鳳山高中校徽" width={36} height={36} className="rounded-full" />
                
                        <span className="text-xl font-bold tracking-wide">專車登記系統</span>
                    </Link>
                    
                    {/* Desktop Navigation and Action Buttons */}
                    <div className="flex items-center gap-1">

                        {/* Desktop Navigation */}
                        <nav className="hidden items-center gap-2 md:flex">
                            {links.map(({ href, label, icon: Icon }) => (
                                <Link
                                    key={href}
                                    href={href}
                                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-3 text-base font-medium transition ${
                                        pathname === href
                                            ? "bg-fg/10 text-fg/90"
                                            : "text-muted hover:bg-bg hover:text-fg"
                                    }`}
                                >
                                    <Icon className="size-4.5" />
                                    {label}
                                </Link>
                            ))}
                        </nav>

                        <ThemeToggle />
                        
                        {/* Logout Button */}
                        <button
                            type="button"
                            onClick={logout}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted transition hover:bg-bg hover:text-fg"
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

            {/* Mobile Navigation */}
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
