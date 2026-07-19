"use client";

import { useAdminGuard, AuthProvider } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { NotFoundCard } from "@/components/NotFoundCard";

// 管理端共用殼層：header/導覽列在此掛載一次，切換頁面時不會重新渲染
export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, status, logout } = useAdminGuard();

    if (status === "denied") {
        return <NotFoundCard />;
    }
    if (status !== "ready" || !user) {
        return null;
    }

    return (
        <AuthProvider user={user} logout={logout}>
            <AppShell user={user} onLogout={logout}>
                {children}
            </AppShell>
        </AuthProvider>
    );
}
