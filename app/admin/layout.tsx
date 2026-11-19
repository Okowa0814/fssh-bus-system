"use client";

import { useAdminGuard, AuthProvider } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { notFound } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, status, logout } = useAdminGuard();

    if (status === "denied") {
        notFound();
    }
    if (status !== "ready" || !user) {
        return null;
    }

    return (
        <AuthProvider user={user} logout={logout}>
            <AppShell>
                {children}
            </AppShell>
        </AuthProvider>
    );
}
