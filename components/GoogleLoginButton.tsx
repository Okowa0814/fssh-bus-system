"use client";

import { useEffect, useRef, useState } from "react";

// TypeScript declaration for the Google Identity Services API
declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: {
                        client_id: string;
                        callback: (response: { credential: string }) => void;
                        hd?: string;
                    }) => void;
                    renderButton: (element: HTMLElement, options: object) => void;
                };
            };
        };
    }
}

const GIS_SRC = "https://accounts.google.com/gsi/client";

/** Google Identity Services 一鍵登入按鈕 */
export function GoogleLoginButton({ onCredential }: { onCredential: (credential: string) => void }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const callbackRef = useRef(onCredential);
    callbackRef.current = onCredential;
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        if (!clientId) {
            setError("尚未設定 NEXT_PUBLIC_GOOGLE_CLIENT_ID，無法載入 Google 登入");
            return;
        }

        const render = () => {
            if (!window.google || !containerRef.current) {
                return;
            }
            window.google.accounts.id.initialize({
                client_id: clientId,
                callback: (response) => callbackRef.current(response.credential),
                hd: process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN,
            });
            containerRef.current.innerHTML = "";

            // 手機版：按鈕撐滿容器寬度（Google 限制 200–400）；桌機維持 280
            const isMobile = window.matchMedia("(max-width: 767px)").matches;
            const width = isMobile
                ? Math.min(400, Math.max(200, Math.floor(containerRef.current.clientWidth)))
                : 280;

            window.google.accounts.id.renderButton(containerRef.current, {
                theme: "filled_black",
                size: "large",
                shape: "pill",
                width,
                text: "signin_with",
                locale: "zh_TW",
            });
        };

        // 容器寬度改變（轉向、縮放視窗）時重畫按鈕，讓手機版的寬度跟著更新
        let lastWidth = containerRef.current?.clientWidth ?? 0;
        let timer: number | undefined;
        const observer = new ResizeObserver(() => {
            const width = containerRef.current?.clientWidth ?? 0;

            if (width === lastWidth) return;
            lastWidth = width;
            window.clearTimeout(timer);
            timer = window.setTimeout(render, 150);
        });
        if (containerRef.current) observer.observe(containerRef.current);
        const stopObserving = () => {
            observer.disconnect();
            window.clearTimeout(timer);
        };

        if (window.google) {
            render();
            return stopObserving;
        }

        let script = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
        if (!script) {
            script = document.createElement("script");
            script.src = GIS_SRC;
            script.async = true;
            document.head.appendChild(script);
        }
        script.addEventListener("load", render);
        script.addEventListener("error", () =>
            setError("Google 登入服務載入失敗，請檢查網路後重新整理"),
        );
        return () => {
            script?.removeEventListener("load", render);
            stopObserving();
        };
    }, []);

    if (error) {
        alert(error);
        return;
    }
    return <div ref={containerRef} className="flex min-h-11 justify-center md:justify-start" />;
}
