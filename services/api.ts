// === Frontend API Service ===
import type { TokenPayload } from "@/lib/types";

const TOKEN_KEY = "fssh_bus_token";

export function getToken(): string | null {
    if (typeof window === "undefined") return null; // While SSR, window is not available

    return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
    window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
    window.localStorage.removeItem(TOKEN_KEY);
}

export function decodeToken(): TokenPayload | null {
    const token = getToken();

    if (!token) return null;

    try {
        const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(
            decodeURIComponent(
                Array.from(atob(base64), (c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join(""),
            ),
        ) as TokenPayload & { sub?: string };

        // Check if the token has expired or is invalid
        if (!payload.sub || payload.exp * 1000 <= Date.now()) {
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
