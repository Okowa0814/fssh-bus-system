"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode, SVGProps } from "react";

import { useCurrentUser } from "@/hooks/useAuth";
import {
    BadgeIcon,
    BusIcon,
    ChevronLeftIcon,
    ClipboardIcon,
    HelpIcon,
    HomeIcon,
    ListIcon,
    LogoutIcon,
    MapPinIcon,
    UserIcon,
} from "./icons";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

interface NavLink {
    href: string;
    label: string; // 桌機頂部導覽
    short: string; // 手機浮動導覽
    icon: Icon;
}

const studentLinks: NavLink[] = [
    { href: "/", label: "首頁", short: "首頁", icon: HomeIcon },
    { href: "/booking", label: "登記座位", short: "登記", icon: BusIcon },
    { href: "/routes", label: "路線", short: "路線", icon: MapPinIcon },
    { href: "/help", label: "使用說明", short: "說明", icon: HelpIcon },
];

const adminLinks: NavLink[] = [
    { href: "/admin", label: "登記概況", short: "概況", icon: ClipboardIcon },
    { href: "/admin/bookings", label: "登記名單", short: "名單", icon: ListIcon },
    { href: "/admin/routes", label: "路線管理", short: "路線", icon: BusIcon },
    { href: "/admin/user", label: "使用者管理", short: "使用者", icon: UserIcon },
];

function LogoutButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label="登出"
            title="登出"
            className="grid size-11 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface2 hover:text-fg"
        >
            <LogoutIcon className="size-5" />
        </button>
    );
}

export function AppShell({ children }: { children: ReactNode }) {
    const { user, logout } = useCurrentUser();
    const pathname = usePathname();
    const links = user.isAdmin ? adminLinks : studentLinks;
    const brand = user.isAdmin ? "專車登記管理" : "鳳山高中專車登記";
    const mobileBrand = user.isAdmin ? "專車登記管理" : "專車登記";

    // 手機版登記流程：改用「回首頁」標題列與頁面自己的底部操作列，不顯示浮動導覽
    const isBookingFlow = pathname === "/booking";

    return (
        <div className="flex min-h-dvh flex-col bg-bg">
            {/* Desktop header：logo｜pill 導覽｜使用者 */}
            <header className="sticky top-0 z-30 hidden border-b border-line bg-bg md:block">
                <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-10 py-3.5">
                    <Link href={user.isAdmin ? "/admin" : "/"} className="flex items-center gap-2.5">
                        <BadgeIcon size={34} />
                        <span className="text-base font-bold">{brand}</span>
                    </Link>

                    <nav aria-label="主要" className="flex flex-wrap gap-1">
                        {links.map(({ href, label }) => {
                            const active = pathname === href;
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    aria-current={active ? "page" : undefined}
                                    className={`flex min-h-11 items-center gap-2 rounded-full px-4 text-[15px] transition ${
                                        active
                                            ? "bg-surface2 font-medium text-fg"
                                            : "text-muted hover:bg-surface2/60 hover:text-fg"
                                    }`}
                                >
                                    {active && (
                                        <span aria-hidden="true" className="size-[7px] rounded-full bg-accent" />
                                    )}
                                    {label}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="flex items-center gap-3">
                        <span
                            aria-hidden="true"
                            className="grid size-9 place-items-center rounded-full bg-surface2 text-[15px] font-bold"
                        >
                            {user.name.charAt(0)}
                        </span>
                        <span className="flex min-w-0 flex-col gap-px">
                            <span className="max-w-40 truncate text-sm font-medium">{user.name}</span>
                            <span className="max-w-40 truncate text-[13px] text-muted">{user.sub}</span>
                        </span>
                        <LogoutButton onClick={logout} />
                    </div>
                </div>
            </header>

            {/* Mobile header */}
            {isBookingFlow ? (
                <header className="sticky top-0 z-30 grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-line bg-bg p-2 md:hidden">
                    <Link
                        href="/"
                        className="flex min-h-11 items-center gap-0.5 justify-self-start rounded-full pr-3 pl-1 text-[15px] font-medium"
                    >
                        <ChevronLeftIcon className="size-5" />
                        回首頁
                    </Link>
                    <span className="text-base font-bold">登記座位</span>
                    <span />
                </header>
            ) : (
                <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-bg py-2 pr-2 pl-5 md:hidden">
                    <span className="flex items-center gap-2.5">
                        <BadgeIcon size={30} />
                        <span className="text-base font-bold">{mobileBrand}</span>
                    </span>
                    <LogoutButton onClick={logout} />
                </header>
            )}

            {/* Main content */}
            <main className="flex-1 px-5 pt-5 pb-32 md:px-10 md:pt-9 md:pb-16">
                <div className="mx-auto w-full max-w-[1160px]">{children}</div>
            </main>

            {/* Mobile floating pill navigation */}
            {!isBookingFlow && (
                <nav
                    aria-label="主要"
                    className="fixed bottom-[calc(20px+env(safe-area-inset-bottom))] left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full border border-line bg-surface p-1.5 shadow-float md:hidden"
                >
                    {links.map(({ href, short, icon: Icon }) => {
                        const active = pathname === href;
                        return active ? (
                            <Link
                                key={href}
                                href={href}
                                aria-current="page"
                                className="flex h-12 items-center gap-2 rounded-full bg-fg pr-4.5 pl-3.5 text-sm font-medium whitespace-nowrap text-ink"
                            >
                                <Icon className="size-5" />
                                {short}
                                <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
                            </Link>
                        ) : (
                            <Link
                                key={href}
                                href={href}
                                aria-label={short}
                                className="grid size-12 place-items-center rounded-full text-muted transition hover:text-fg"
                            >
                                <Icon className="size-5" />
                            </Link>
                        );
                    })}
                </nav>
            )}
        </div>
    );
}
