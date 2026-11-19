// === Frontend API Service ===
import type { TokenPayload } from "@/lib/types";

const TOKEN_KEY = "fssh_bus_token";

export function getToken(): string | null {
    if (typeof window === "undefined") return null; // While SSR, window is not available

    return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
    if (typeof window === "undefined") return;

    window.localStorage.removeItem(TOKEN_KEY);
}

export function decodeToken(): TokenPayload | null {
    const token = getToken();

    if (!token) return null;

    try {
        // A JWT must have exactly 3 parts: header.payload.signature
        const parts = token.split(".");

        if (parts.length !== 3) {
            clearToken();
            return null;
        }

        // Base64URL -> standard Base64, and pad with '=' up to a multiple of 4
        const base64Url = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
        
        const base64 = base64Url + padding;

        // Decode one character at a time to avoid garbled Chinese or special characters"
        // The decodeURIComponent trick is used to handle UTF-8 characters correctly
        const jsonPayload = decodeURIComponent(
            Array.from(atob(base64), (c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join(""),
        );
        
        const payload = JSON.parse(jsonPayload) as TokenPayload;

        // Check required fields and expiry (a missing exp must not count as "not expired")
        if (!payload.sub || typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now()) {
            clearToken();
            return null;
        }

        return payload;
    } catch {
        clearToken();
        return null;
    }
}

// === API Request Function ===
interface ApiOptions {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
}

export class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
    const headers: Record<string, string> = {};
    const token = getToken();

    if (token) headers.Authorization = `Bearer ${token}`;
    
    // undefined equals Option is GET
    if (options.body !== undefined) headers["Content-Type"] = "application/json";
    
    let response: Response;
    try {
        response = await fetch(path, {
            method: options.method ?? "GET",
            headers,
            body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        });
    } catch {
        throw new ApiError(0, "無法連線到伺服器，請檢查網路");
    }

    // token 過期 / 無效：清除並回登入頁
    if (response.status === 401) {
        clearToken();
        if (window.location.pathname !== "/login") window.location.href = "/login";
        throw new ApiError(401, "登入已過期，請重新登入");
    }

    const data = await response.json().catch(() => null);
    if (!response.ok) {
        const message =
            (data as { message?: string } | null)?.message ??
            (response.status === 429 ? "操作太頻繁，請稍後再試" : "請求失敗，請稍後再試");
        throw new ApiError(response.status, message);
    }
    return data as T;
}
