"use client";

import { useStudentGuard, AuthProvider } from "@/hooks/useAuth";
import { AppShell } from "@/components";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
    const { user, status, logout } = useStudentGuard();

    if (status !== "ready" || !user) return null;

    return (
        <AuthProvider user={user} logout={logout}>
            <AppShell>
                {children}
            </AppShell>
        </AuthProvider>
    );
}
