"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "./icons";

const THEME_KEY = "fssh_bus_theme";

export function ThemeToggle() {
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