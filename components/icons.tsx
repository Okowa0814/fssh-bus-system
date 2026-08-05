import Image from "next/image";
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

// 校徽（點陣圖，非 stroke 線條圖示
export function BadgeIcon({ size = 32, className }: { size?: number; className?: string }) {
    return (
        <Image
            src="/fssh-badge.png"
            alt="鳳山高中校徽"
            width={size}
            height={size}
            style={{ width: size, height: size }}
            className={`shrink-0 rounded-full ${className ?? ""}`}
        />
    );
}

function base(props: IconProps): IconProps {
    return {
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 2,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": true,
        ...props,
    };
}

export function HomeIcon(props: IconProps) {
    return (
        <svg {...base(props)}>
            <path d="m3 11 9-8 9 8" />
            <path d="M5 10v10h14V10" />
        </svg>
    );
}

export function BusIcon(props: IconProps) {
    return (
        <svg {...base(props)}>
            <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />
            <path d="M4 11h16" />
            <path d="M8 17v2M16 17v2" />
            <circle cx="8" cy="14" r="0.5" fill="currentColor" />
            <circle cx="16" cy="14" r="0.5" fill="currentColor" />
        </svg>
    );
}

export function MapPinIcon(props: IconProps) {
    return (
        <svg {...base(props)}>
            <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z" />
            <circle cx="12" cy="10" r="2.5" />
        </svg>
    );
}

export function UserIcon(props: IconProps) {
    return (
        <svg {...base(props)}>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-3.6 3.6-6 8-6s8 2.4 8 6" />
        </svg>
    );
}

export function HelpIcon(props: IconProps) {
    return (
        <svg {...base(props)}>
            <circle cx="12" cy="12" r="9" />
            <path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.8.3-.9 1-.9 1.7" />
            <circle cx="12" cy="17" r="0.5" fill="currentColor" />
        </svg>
    );
}

export function ClipboardIcon(props: IconProps) {
    return (
        <svg {...base(props)}>
            <rect x="6" y="4" width="12" height="17" rx="2" />
            <path d="M9 4a2 2 0 0 1 6 0" />
            <path d="M9 10h6M9 14h6" />
        </svg>
    );
}

export function LogoutIcon(props: IconProps) {
    return (
        <svg {...base(props)}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="m16 17 5-5-5-5" />
            <path d="M21 12H9" />
        </svg>
    );
}

export function TrashIcon(props: IconProps) {
    return (
        <svg {...base(props)}>
            <path d="M4 7h16" />
            <path d="M9 7V4h6v3" />
            <path d="M6 7l1 13h10l1-13" />
            <path d="M10 11v6M14 11v6" />
        </svg>
    );
}

export function PlusIcon(props: IconProps) {
    return (
        <svg {...base(props)}>
            <path d="M12 5v14M5 12h14" />
        </svg>
    );
}

export function SaveIcon(props: IconProps) {
    return (
        <svg {...base(props)}>
            <path d="M5 4h11l3 3v13H5z" />
            <path d="M8 4v5h7V4" />
            <path d="M8 21v-6h8v6" />
        </svg>
    );
}

export function ListIcon(props: IconProps) {
    return (
        <svg {...base(props)}>
            <path d="M9 6h11M9 12h11M9 18h11" />
            <circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none" />
            <circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" />
            <circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none" />
        </svg>
    );
}

export function MoreIcon(props: IconProps) {
    return (
        <svg {...base(props)}>
            <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
        </svg>
    );
}

export function RefreshIcon(props: IconProps) {
    return (
        <svg {...base(props)}>
            <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
            <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" />
            <path d="M3 21v-5h5" />
            <path d="M21 3v5h-5" />
        </svg>
    );
}
