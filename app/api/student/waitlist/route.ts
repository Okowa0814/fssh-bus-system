import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/server/db";
import { requireStudent, isResponse } from "@/server/auth";
import { ok, fail, ApiFailure } from "@/server/http";
import { acquireLockResilient, releaseLock, routeLockKey, studentLockKey } from "@/server/lock";
import { getBookingWindow } from "@/server/settings";
import { MAX_WAITLIST } from "@/server/waitlist";
import type { StationDto } from "@/lib/types";

const LOCK_TTL_MS = 5000;

/**
 * POST /api/student/waitlist — 路線滿位後加入候補名單（僅限學生，最多 10 人）
 * Redis 分散式鎖，由外而內依序取得——
 *   學生鎖（序列化同一學生的登記／候補寫入，避免併發請求繞過「一人一位」限制）
 *   → 路線鎖（序列化同一路線的候補加入與座位遞補，避免候補名額超收）
 */
export async function POST(request: Request) {
    const auth = await requireStudent(request);
    if (isResponse(auth)) {
        return auth;
    }

    let body: { routeId?: unknown; station?: unknown };
    try {
        body = await request.json();
    } catch {
        return fail(400, "請求格式錯誤");
    }

    const routeId = Number(body.routeId);
    const station = typeof body.station === "string" ? body.station : "";
    if (!Number.isInteger(routeId) || !station) {
        return fail(400, "路線或站點格式錯誤");
    }

    const window = await getBookingWindow();
    if (!window.open) {
        return fail(403, "目前不在登記時間");
    }

    const studentLock = studentLockKey(auth.studentId);
    const routeLock = routeLockKey(routeId);

    let studentToken: string | null = null;
    let routeToken: string | null = null;

    try {
        try {
            studentToken = await acquireLockResilient(studentLock, LOCK_TTL_MS);
        } catch (error) {
            console.error("取得學生鎖失敗:", error);
            return fail(503, "系統忙碌中，請稍後再試");
        }
        if (!studentToken) {
            return fail(423, "你有其他登記或候補要求正在處理中，請稍後再試");
        }

        try {
            routeToken = await acquireLockResilient(routeLock, LOCK_TTL_MS);
        } catch (error) {
            console.error("取得路線鎖失敗:", error);
            return fail(503, "系統忙碌中，請稍後再試");
        }
        if (!routeToken) {
            return fail(423, "候補名單操作中，請稍後再試");
        }

        const entry = await prisma.$transaction(async (tx) => {
            const route = await tx.route.findUnique({ where: { id: routeId } });
            if (!route) {
                throw new ApiFailure(404, "查無此路線");
            }
            if (!route.isFull) {
                throw new ApiFailure(409, "此路線尚未滿位，請直接登記座位");
            }

            const stations = route.stations as unknown as StationDto[];
            if (!stations.some((s) => s.name === station)) {
                throw new ApiFailure(400, "查無此站點");
            }

            const mine = await tx.booking.findFirst({
                where: { studentId: auth.studentId },
            });
            if (mine) {
                throw new ApiFailure(409, "你已登記過座位，請先於身份頁取消原登記");
            }

            const waitlisted = await tx.waitlistEntry.findFirst({
                where: { studentId: auth.studentId },
            });
            if (waitlisted) {
                throw new ApiFailure(409, "你已在候補名單中");
            }

            const count = await tx.waitlistEntry.count({ where: { routeId } });
            if (count >= MAX_WAITLIST) {
                throw new ApiFailure(409, "候補名單已額滿");
            }

            return tx.waitlistEntry.create({
                data: { studentId: auth.studentId, routeId, station },
                include: { route: { select: { id: true, name: true, stations: true } } },
            });
        });

        return ok(entry, 201);
    } catch (error) {
        if (error instanceof ApiFailure) {
            return fail(error.status, error.message);
        }
        // ── 第三道防線：@@unique([studentId]) 唯一約束衝突（理論上不會發生） ──
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return fail(409, "你已在候補名單中");
        }
        console.error("候補登記失敗:", error);
        return fail(500, "候補登記失敗，請稍後再試");
    } finally {
        if (routeToken) {
            await releaseLock(routeLock, routeToken);
        }
        if (studentToken) {
            await releaseLock(studentLock, studentToken);
        }
    }
}
