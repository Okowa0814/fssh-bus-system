"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    createContext,
    useContext,
    useLayoutEffect,
    useRef,
    useState,
    type ComponentType,
    type MouseEvent,
    type ReactNode,
    type SVGProps,
} from "react";

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
import { PageLoader } from "./PageLoader";

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

// 登記頁目前的狀態，決定手機版的標題列與導覽列：
//   loading：載入中，用登記頁的標題列（不要看起來像首頁），但保留導覽列
//   booking：登記流程中，用登記頁的標題列，隱藏導覽列專注在選位
//   blocked：無法登記（未開放、已登記、候補中、已完成），改回一般標題列與導覽
export type BookingNavMode = "loading" | "booking" | "blocked";

const BookingNavContext = createContext<(mode: BookingNavMode) => void>(() => {});

/** 登記頁呼叫：通知外殼目前的狀態 */
export function useBookingNav(mode: BookingNavMode) {
    const setMode = useContext(BookingNavContext);

    // 用 layout effect：在畫面繪製前就通知外殼，避免先閃過錯誤的標題列／導覽狀態
    useLayoutEffect(() => {
        setMode(mode);
        return () => setMode("loading");
    }, [setMode, mode]);
}

// 導覽列的滑動高亮：量測選中項目的位置，讓背景高亮塊以 iOS 的減速曲線滑過去
function useSlidingIndicator(activeIndex: number) {
    const navRef = useRef<HTMLElement>(null);
    const indicatorRef = useRef<HTMLSpanElement>(null);

    useLayoutEffect(() => {
        const nav = navRef.current;
        const indicator = indicatorRef.current;
        if (!nav || !indicator) {
            return;
        }

        const place = () => {
            const item = nav.querySelectorAll<HTMLElement>("[data-nav-item]")[activeIndex];
            indicator.style.opacity = item ? "1" : "0";
            if (!item) {
                return;
            }
            indicator.style.width = `${item.offsetWidth}px`;
            indicator.style.height = `${item.offsetHeight}px`;
            indicator.style.transform = `translate(${item.offsetLeft}px, ${item.offsetTop}px)`;
        };
        place();

        // 第一次定位直接到位，之後切換才播放滑動動畫
        const frame = requestAnimationFrame(() => {
            indicator.dataset.ready = "";
        });
        const observer = new ResizeObserver(place);
        observer.observe(nav);

        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
        };
    }, [activeIndex]);

    return { navRef, indicatorRef };
}

const indicatorMotion =
    "data-ready:transition-[transform,width,height,opacity] data-ready:duration-[450ms] data-ready:ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none";

function DesktopNav({ links, activeHref }: { links: NavLink[]; activeHref: string }) {
    const { navRef, indicatorRef } = useSlidingIndicator(links.findIndex(({ href }) => href === activeHref));

    return (
        <nav ref={navRef} aria-label="主要" className="relative flex flex-wrap gap-1">
            <span
                ref={indicatorRef}
                aria-hidden="true"
                className={`pointer-events-none absolute top-0 left-0 rounded-full bg-surface2 opacity-0 ${indicatorMotion}`}
            />
            {links.map(({ href, label }) => {
                const active = href === activeHref;
                // 圓點與文字位移都不佔版面，選中與否寬度一致，高亮塊才能準確滑到定位
                return (
                    <Link
                        key={href}
                        href={href}
                        data-nav-item
                        aria-current={active ? "page" : undefined}
                        className={`relative flex min-h-11 items-center rounded-full px-[23.5px] text-[15px] transition-colors duration-300 ${
                            active ? "font-medium text-fg" : "text-muted hover:bg-surface2/60 hover:text-fg"
                        }`}
                    >
                        <span
                            aria-hidden="true"
                            className={`absolute top-1/2 left-4 -mt-[3.5px] size-[7px] rounded-full bg-accent transition-transform duration-300 ${
                                active ? "scale-100" : "scale-0"
                            }`}
                        />
                        <span
                            className={`transition-transform duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
                                active ? "translate-x-[7.5px]" : ""
                            }`}
                        >
                            {label}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}

function MobileNav({ links, activeHref, hidden }: { links: NavLink[]; activeHref: string; hidden: boolean }) {
    const { navRef, indicatorRef } = useSlidingIndicator(links.findIndex(({ href }) => href === activeHref));

    return (
        <nav
            ref={navRef}
            aria-label="主要"
            aria-hidden={hidden}
            inert={hidden}
            className={`fixed bottom-[calc(20px+env(safe-area-inset-bottom))] left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full border border-line bg-surface p-1.5 shadow-float transition-[translate,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none md:hidden ${
                hidden ? "pointer-events-none translate-y-[calc(100%+48px)] opacity-0" : ""
            }`}
        >
            <span
                ref={indicatorRef}
                aria-hidden="true"
                className={`pointer-events-none absolute top-0 left-0 rounded-full bg-fg opacity-0 ${indicatorMotion}`}
            />
            {links.map(({ href, short, icon: Icon }) => {
                const active = href === activeHref;
                // 每個項目等寬，高亮塊在固定的格子間滑動（同 iOS 分頁列）
                return (
                    <Link
                        key={href}
                        href={href}
                        data-nav-item
                        aria-current={active ? "page" : undefined}
                        className={`relative flex h-13 w-17 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-medium transition-colors duration-300 ${
                            active ? "text-ink" : "text-muted hover:text-fg"
                        }`}
                    >
                        <Icon className="size-5" />
                        {short}
                    </Link>
                );
            })}
        </nav>
    );
}

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
    const [bookingMode, setBookingMode] = useState<BookingNavMode>("loading");

    // 手機版登記流程：改用「回首頁」標題列與頁面自己的底部操作列，不顯示浮動導覽；
    // 無法登記（未開放、已登記、候補中、已完成）時登記頁會通知外殼，改回一般標題列與導覽
    const isBookingFlow = pathname === "/booking" && bookingMode !== "blocked";

    // 點下站內連結的當下就記住目標頁：導覽高亮立刻滑過去、內容區立刻換成 loader，
    // 不必等新頁面載入（首次進入某頁時需要較久）才有反應
    const [pending, setPending] = useState<{ href: string; from: string } | null>(null);
    if (pending && pending.from !== pathname) {
        setPending(null);
    }
    const navigating = pending !== null;
    const activeHref = pending?.href ?? pathname;

    const handleLinkClick = (event: MouseEvent<HTMLDivElement>) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
        }
        const anchor = (event.target as Element).closest("a[href]");
        if (
            !(anchor instanceof HTMLAnchorElement) ||
            anchor.target === "_blank" ||
            anchor.origin !== window.location.origin ||
            anchor.pathname === pathname
        ) {
            return;
        }
        setPending({ href: anchor.pathname, from: pathname });
    };

    return (
        <BookingNavContext value={setBookingMode}>
            <div onClickCapture={handleLinkClick} className="flex min-h-dvh flex-col bg-bg">
                {/* Desktop header：logo｜pill 導覽｜使用者 */}
                <header className="sticky top-0 z-30 hidden border-b border-line bg-bg md:block">
                    <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-10 py-3.5">
                        <Link href={user.isAdmin ? "/admin" : "/"} className="flex items-center gap-2.5">
                            <BadgeIcon size={34} />
                            <span className="text-base font-bold">{brand}</span>
                        </Link>

                        <DesktopNav links={links} activeHref={activeHref} />

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
                    <header className="sticky top-0 z-30 grid animate-[fade-in_220ms_ease-out] grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-line bg-bg p-2 motion-reduce:animate-none md:hidden">
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
                    <header className="sticky top-0 z-30 flex animate-[fade-in_220ms_ease-out] items-center justify-between gap-3 border-b border-line bg-bg py-2 pr-2 pl-5 motion-reduce:animate-none md:hidden">
                        <span className="flex items-center gap-2.5">
                            <BadgeIcon size={30} />
                            <span className="text-base font-bold">{mobileBrand}</span>
                        </span>
                        <LogoutButton onClick={logout} />
                    </header>
                )}

                {/* Main content */}
                <main className="flex-1 px-5 pt-5 pb-32 md:px-10 md:pt-9 md:pb-16">
                    <div
                        key={navigating ? "navigating" : pathname}
                        className="mx-auto w-full max-w-[1160px] animate-[page-in_240ms_ease-out] motion-reduce:animate-none"
                    >
                        {navigating ? <PageLoader /> : children}
                    </div>
                </main>

                {/* Mobile floating pill navigation */}
                <MobileNav links={links} activeHref={activeHref} hidden={isBookingFlow && bookingMode === "booking"} />
            </div>
        </BookingNavContext>
    );
}
