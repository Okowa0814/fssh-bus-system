"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/services/api";
import type { AdminUserDto } from "@/lib/types";
import { ActionMenu } from "@/components";

export default function AdminUserPage() {
    const [users, setUsers] = useState<AdminUserDto[]>([]);
    const [keyword, setKeyword] = useState("");
    const [pendingId, setPendingId] = useState<string | null>(null);

    useEffect(() => {
        api<AdminUserDto[]>("/api/admin/user").then(setUsers).catch(() => {});
    }, []);

    const filtered = useMemo(() => {
        const query = keyword.trim();
        if (!query) {
            return users;
        }
        return users.filter((user) => user.studentId.includes(query) || user.name.includes(query));
    }, [users, keyword]);

    const rename = async (user: AdminUserDto) => {
        const name = window.prompt("輸入新姓名", user.name)?.trim();
        if (!name || name === user.name) {
            return;
        }
        setPendingId(user.studentId);
        try {
            const updated = await api<AdminUserDto>(`/api/admin/user/${user.studentId}`, {
                method: "PATCH",
                body: { name },
            });
            setUsers((previous) =>
                previous.map((u) => (u.studentId === user.studentId ? updated : u)),
            );
        } catch (error) {
            alert(error instanceof ApiError ? error.message : "改名失敗，請稍後再試");
        } finally {
            setPendingId(null);
        }
    };

    return (
        <div className="flex flex-col gap-5.5">
            <h1 className="mt-2 text-[clamp(24px,3vw,32px)] font-bold tracking-tight">使用者管理</h1>

            {/* Filter */}
            <section className="rounded-card bg-surface p-6 shadow-card">
                <div className="flex flex-wrap items-center gap-2.5">
                    <input
                        type="search"
                        placeholder="搜尋學號或姓名…"
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                        className="w-56 rounded-field border border-line bg-surface2 px-3.5 py-2.5 text-sm outline-none focus:border-accent"
                    />
                    <span className="ml-auto font-bold font-mono text-muted">共 {filtered.length} 筆</span>
                </div>
            </section>

            {/* Table */}
            <section className="rounded-card bg-surface p-6 shadow-card">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-180 text-left text-sm">
                        <thead>
                            <tr className="border-b border-line text-lg tracking-wide text-muted uppercase">
                                <th className="py-3 pr-4 font-medium">學號</th>
                                <th className="py-3 pr-4 font-medium">姓名</th>
                                <th className="py-3 pr-4 font-medium">Email</th>
                                <th className="py-3 pr-4 font-medium">入學年份</th>
                                <th className="py-3 pr-4 font-medium">身份</th>
                                <th className="py-3 font-medium" />
                            </tr>
                        </thead>

                        <tbody>
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-10 text-center text-muted">
                                        沒有符合條件的使用者。
                                    </td>
                                </tr>
                            )}

                            {filtered.map((user, i) => (
                                <tr
                                    key={user.studentId}
                                    className={`border-b border-line last:border-0 ${i % 2 ? "bg-[#f1f1ee]" : ""}`}
                                >
                                    <td className="py-3 pr-4 font-mono font-medium">{user.studentId}</td>
                                    <td className="py-3 pr-4">{user.name}</td>
                                    <td className="py-3 pr-4 text-muted">{user.email}</td>
                                    <td className="py-3 pr-4 text-muted">{user.enrollmentYear}</td>
                                    <td className="py-3 pr-4 text-muted">
                                        {user.isAdmin ? "管理員" : "學生"}
                                    </td>
                                    <td className="py-3 text-right">
                                        <ActionMenu
                                            items={[
                                                {
                                                    label: "改名",
                                                    disabled: pendingId === user.studentId,
                                                    onSelect: () => void rename(user),
                                                },
                                            ]}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
