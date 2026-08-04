"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode, SVGProps } from "react";

import { useCurrentUser } from "@/hooks/useAuth";
import { BadgeIcon, BusIcon, ClipboardIcon, HelpIcon, HomeIcon, LogoutIcon, MapPinIcon } from "./icons";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

const studentLinks: { href: string; label: string; icon: Icon }[] = [
    { href: "/", label: "首頁", icon: HomeIcon },
    { href: "/booking", label: "登記", icon: BusIcon },
    { href: "/routes", label: "路線", icon: MapPinIcon },
    { href: "/help", label: "說明", icon: HelpIcon },
];

const adminLinks: { href: string; label: string; icon: Icon }[] = [
    { href: "/admin", label: "登記總覽", icon: ClipboardIcon },
    { href: "/admin/routes", label: "路線管理", icon: BusIcon },
];

const titleMap: Record<string, string> = {
    "/": "專車登記",
    "/booking": "登記座位",
    "/routes": "路線總覽",
    "/help": "使用說明",
    "/admin": "管理後台",
    "/admin/routes": "路線管理",
};

function Logo({ size }: { size: number }) {
    return <BadgeIcon size={size} />;
}

function LogoutButton({ onClick, className = "" }: { onClick: () => void; className?: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label="登出"
            title="登出"
            className={`grid size-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-danger-wash hover:text-danger-ink ${className}`}
        >
            <LogoutIcon className="size-4.5" />
        </button>
    );
}

export function AppShell({ children }: { children: ReactNode }) {
    const { user, logout } = useCurrentUser();
    const pathname = usePathname();
    const links = user.isAdmin ? adminLinks : studentLinks;
    const title = titleMap[pathname] ?? "專車登記";

    return (
        <div className="flex min-h-dvh flex-col md:flex-row">
            {/* Desktop Sidebar */}
            <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-1 border-r border-line px-3.5 py-5 md:flex">
                {/* Logo & Title */}
                <div className="flex items-center gap-2.5 px-2 pb-4">
                    <Logo size={32} />
                    <span className="text-xl font-bold tracking-tight">學生專車登記</span>
                </div>

                {/* Navigation */}
                <nav className="flex flex-col gap-0.5">
                    {links.map(({ href, label, icon: Icon }) => {
                        const active = pathname === href;
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`flex items-center gap-2.5 rounded-field px-3 py-2.5 text-lg transition ${
                                    active ? "bg-accent-wash font-medium text-fg" : "text-muted hover:text-fg"
                                }`}
                            >
                                <Icon className="size-5" />
                                {label}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Profile */}
                <div className="mt-auto flex items-center gap-2.5 border-t border-line px-2 pt-3.5">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-wash font-medium text-xs text-accent-ink">
                        {user.name.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium">{user.name}</p>
                        <p className="truncate font-mono text-muted">
                            {user.enrollmentYear ? `${user.enrollmentYear} · ` : ""}
                            {user.sub}
                        </p>
                    </div>
                    <LogoutButton onClick={logout} className="-mr-1" />
                </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                {/* Mobile Header */}
                <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-bg px-4.5 py-3 md:hidden">
                    <div className="flex items-center gap-2.5">
                        <Logo size={28} />
                        <span className="text-xl font-bold tracking-tight">{title}</span>
                    </div>
                    <LogoutButton onClick={logout} className="-mr-1.5" />
                </header>
                
                {/* Main Content */}
                <main className="flex-1 px-4.5 pb-24 pt-5 md:px-11 md:pb-15 md:pt-9">
                    <div className="mx-auto w-full max-w-5xl">{children}</div>
                </main>

                {/* Mobile Footer Navigation */}
                <nav className="fixed inset-x-0 bottom-0 z-20 flex gap-0.5 border-t border-line bg-surface px-2.5 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 md:hidden">
                    {links.map(({ href, label, icon: Icon }) => {
                        const active = pathname === href;
                        return (
                            <Link
                                key={href}
                                href={href}
                                className="flex flex-1 flex-col items-center gap-1 rounded-field px-0.5 py-1.5"
                            >
                                <Icon
                                    className={`size-5 transition ${active ? "text-accent" : "text-muted"}`}
                                    strokeWidth={active ? 2.25 : 2}
                                />
                                <span
                                    className={`text-[11px] ${active ? "font-medium text-fg" : "text-muted"}`}
                                >
                                    {label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}
