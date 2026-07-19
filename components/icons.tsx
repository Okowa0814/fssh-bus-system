// 共用 inline SVG 圖示（stroke 沿用 currentColor，方便配色）
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

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

export function UserIcon(props: IconProps) {
    return (
        <svg {...base(props)}>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-3.6 3.6-6 8-6s8 2.4 8 6" />
        </svg>
    );
}

export function HomeIcon(props: IconProps) {
    return (
        <svg {...base(props)}>
            <path d="m3 11 9-8 9 8" />
            <path d="M5 10v10h14V10" />
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

export function ArrowRightIcon(props: IconProps) {
    return (
        <svg {...base(props)}>
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
        </svg>
    );
}

export function CheckIcon(props: IconProps) {
    return (
        <svg {...base(props)}>
            <path d="m5 13 4 4L19 7" />
        </svg>
    );
}

export function XIcon(props: IconProps) {
    return (
        <svg {...base(props)}>
            <path d="M6 6l12 12M18 6 6 18" />
        </svg>
    );
}

export function SunIcon(props: IconProps) {
    return (
        <svg {...base(props)}>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
    );
}

export function MoonIcon(props: IconProps) {
    return (
        <svg {...base(props)}>
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
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

export function MapPinIcon(props: IconProps) {
    return (
        <svg {...base(props)}>
            <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z" />
            <circle cx="12" cy="10" r="2.5" />
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

export function TrashIcon(props: IconProps) {
    return (
        <svg {...base(props)}>
            <path d="M4 7h16" />
            <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
            <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
        </svg>
    );
}

export function ChevronUpIcon(props: IconProps) {
    return (
        <svg {...base(props)}>
            <path d="m6 15 6-6 6 6" />
        </svg>
    );
}

export function ChevronDownIcon(props: IconProps) {
    return (
        <svg {...base(props)}>
            <path d="m6 9 6 6 6-6" />
        </svg>
    );
}
