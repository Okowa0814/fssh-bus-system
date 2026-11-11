"use client";

import { useEffect, useRef, useState } from "react";

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

const GSI_SRC = "https://accounts.google.com/gsi/client";

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
            window.google.accounts.id.renderButton(containerRef.current, {
                theme: "filled_black",
                size: "large",
                shape: "pill",
                width: 280,
                text: "signin_with",
                locale: "zh_TW",
            });
        };

        if (window.google) {
            render();
            return;
        }

        let script = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
        if (!script) {
            script = document.createElement("script");
            script.src = GSI_SRC;
            script.async = true;
            document.head.appendChild(script);
        }
        script.addEventListener("load", render);
        script.addEventListener("error", () =>
            setError("Google 登入服務載入失敗，請檢查網路後重新整理"),
        );
        return () => script?.removeEventListener("load", render);
    }, []);

    if (error) {
        alert(error);
        return;
    }
    return <div ref={containerRef} className="flex min-h-11 justify-start" />;
}
